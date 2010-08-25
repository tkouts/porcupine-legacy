#==============================================================================
#   Copyright (c) 2005-2010, Tassos Koutsovassilis
#
#   This file is part of Porcupine.
#   Porcupine is free software; you can redistribute it and/or modify
#   it under the terms of the GNU Lesser General Public License as published by
#   the Free Software Foundation; either version 2.1 of the License, or
#   (at your option) any later version.
#   Porcupine is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU Lesser General Public License for more details.
#   You should have received a copy of the GNU Lesser General Public License
#   along with Porcupine; if not, write to the Free Software
#   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#==============================================================================
"""
OQL query optimization functions
"""
from porcupine import db
from porcupine.core.compat import str
from porcupine.core.oql.core import evaluate_stack, operators2, operators1


def optimize(select_from, where_condition,
             order_by, sort_order,
             select_range, variables):
    uses_indexes = False
    select_top = None
    top_accumulative = False

    if where_condition:
        # optimize query
        optimized = _optimize_conditions(where_condition[:], variables)
        uses_indexes = all([l[0] for l in optimized])
    if not uses_indexes:
        optimized = [[None, where_condition]]

    # order by, range optimizations
    if order_by:
        # check if ordering is indexed
        optimize_ordering = (len(order_by) == 1 and
                             db._db.has_index(order_by[0][0]))

        if optimize_ordering:
            is_single_shallow = len(select_from) == 1 and \
                                not select_from[0][0]

            if uses_indexes:
                if len(optimized) == 1:
                    # we do not have indexed ORing
                    indexed_lookups = optimized[0][0]
                    if len(indexed_lookups) == 1 and \
                            indexed_lookups[0][0] == order_by[0][0]:
                        # select ... from ...
                        # where indexed =|>|<|<=|>= value
                        # order by indexed asc|desc
                        indexed_range = indexed_lookups[0][1]
                        if not type(indexed_range) == tuple:
                            # remove order by
                            # we have selected only one value
                            order_by = []
                            if select_range:
                                select_top = select_range[1]
                                top_accumulative = True
                        else:
                            # we have a possible range of values
                            reversed = (sort_order == False)
                            if reversed:
                                # reverse lookup cursor
                                indexed_lookups[0][1] = (indexed_range[0],
                                                         indexed_range[1],
                                                         reversed)

                            if is_single_shallow:
                                order_by = []

                            if select_range:
                                select_top = select_range[1]

            else:
                # use ordering attribute
                reversed = (sort_order == False)
                optimized = [[[(order_by[0][0], (None, None, reversed))],
                              where_condition]]
                if is_single_shallow:
                    # shallow select from one container
                    order_by = []
                    top_accumulative = True

                if select_range:
                    # select with indexed ordering and range
                    select_top = select_range[1]
    elif select_range:
        # range without ordering
        select_top = select_range[1]
        top_accumulative = True

    return optimized, select_top, top_accumulative, order_by


def _optimize_conditions(conditions, variables, parent_op=None):
    op2 = None
    op = conditions[-1]
    # list of [[indexed_lookups], [rte conditions]]
    optimized = [[[], []]]
    # keep a copy of conditions
    cp_conditions = conditions[:]

    if type(op) == str and op in operators2:
        op2 = conditions.pop()
        if op == 'and':
            op1 = _optimize_conditions(conditions, variables, op)
            op2 = _optimize_conditions(conditions, variables, op)
            # calculate indexed lookups
            if op2[0][0]:
                optimized[0][0] += op2[0][0]
            if op1[0][0]:
                # check if the same index is already included
                is_optimized = False
                if op1[0][0][0][0] in [l[0] for l in optimized[0][0]]:
                    if type(op1[0][0][0][1]) == tuple:
                        new_lookup = op1[0][0][0]
                        lookups = [l for l in optimized[0][0]
                                   if l[0] == new_lookup[0]]
                        for lookup in lookups:
                            if type(lookup[1]) == tuple:
                                if lookup[1][0] is None and new_lookup[1][0]:
                                    lookup[1] = (new_lookup[1][0],
                                                 lookup[1][1])
                                    is_optimized = True
                                    break
                                elif lookup[1][1] is None and new_lookup[1][1]:
                                    lookup[1] = (lookup[1][0],
                                                 new_lookup[1][1])
                                    is_optimized = True
                                    break
                if not is_optimized:
                    optimized[0][0] += op1[0][0]

            # calculate rte conditions
            optimized[0][1] += op2[0][1] + op1[0][1]
            if op2[0][1] and op1[0][1]:
                optimized[0][1] += ['and']
        elif op == 'or':
            if parent_op == 'and':
                # remove operands
                _pop_stack(conditions)
                _pop_stack(conditions)
                optimized[0][1] += cp_conditions[len(conditions):]
            else:
                op1 = _optimize_conditions(conditions, variables, op)
                op2 = _optimize_conditions(conditions, variables, op)
                optimized = op1 + op2
        elif op in ['=', '<', '>', '<=', '>=']:
            index = conditions[-1]
            if type(index) == str:
                lookup = None
                if index == '_id':
                    index = 'id'

                if db._db.has_index(index):
                    conditions.pop()

                    if isinstance(conditions[-1], (bytes, str)) \
                            and conditions[-1][0] == '$' \
                            and conditions[-1][1:] not in variables:
                        # query parameter
                        index_value = conditions.pop()
                    else:
                        # try to evaluate index value
                        index_value = evaluate_stack(conditions, variables)

                    if index_value is not None:
                        # we have an immutable value
                        if op == '=':
                            lookup = [index, index_value]
                        elif op in ['<', '<=']:
                            lookup = [index, (None, [index_value, '=' in op])]
                        elif op in ['>', '>=']:
                            lookup = [index, ([index_value, '=' in op], None)]
                        optimized[0][0].append(lookup)

                if lookup is None:
                    # query on an non-indexed attribute
                    # or on an indexed attribute with mutable value
                    optimized[0][1] = cp_conditions[len(conditions):] + \
                                      optimized[0][1]
            else:
                # remove operands
                _pop_stack(conditions)
                _pop_stack(conditions)
                optimized[0][1] = cp_conditions[len(conditions):] + \
                                  optimized[0][1]
    # functions
    elif type(op) == list:
        lookup = None
        cmd_code, params = op
        optimizer = globals().get('h_%s_opt' % cmd_code)
        if optimizer is not None:
            lookup = optimizer(params, variables)
        if lookup is None:
            optimized[0][1] = [op] + optimized[0][1]
        else:
            optimized[0][0].append(lookup)
    else:
        _pop_stack(conditions)
        optimized[0][1] = cp_conditions[len(conditions):] + optimized[0][1]

    return optimized


def _pop_stack(stack):
    op = stack.pop()
    if type(op) == str:
        if op in operators2:
            _pop_stack(stack)
            _pop_stack(stack)
        elif op in operators1:
            _pop_stack(stack)


# BETWEEN optimizer
def h_61_opt(params, variables):
    if len(params[0]) == 1 and db._db.has_index(params[0][0]):
        bounds = []
        for expr in params[1:]:
            if len(expr) == 1 \
                    and isinstance(expr[0], (bytes, str)) \
                    and expr[0][0] == '$' \
                    and expr[0][1:] not in variables:
                # parameter
                bounds.append(expr[0])
            else:
                bounds.append(evaluate_stack(expr[:], variables))
        if all(bounds):
            return [params[0][0], ([bounds[0], True], [bounds[1], False])]
