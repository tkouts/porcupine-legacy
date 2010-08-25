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
OQL Core Interpreter
"""
import types
import copy

from porcupine import datatypes
from porcupine import db
from porcupine.core.compat import str
from porcupine.core.objectSet import ObjectSet
from porcupine.utils import misc
from porcupine.utils.date import Date

NEG = 1

ARRAY = 51

FUNCTION = 60
BETWEEN = 61
IN = 62
HASATTR = 63
SLICE = 64
IF = 65
INSTANCEOF = 66
GETPARENT = 67

CMD_ASSIGN = 100
OQL_SELECT = 200

# map operator symbols to corresponding operations
opn2 = {'+': lambda a, b: a + b,
        '-': lambda a, b: a - b,
        '*': lambda a, b: a * b,
        '/': lambda a, b: a / b,
        '^': lambda a, b: a ** b,

        '=': lambda a, b: a == b,
        '<>': lambda a, b: a != b,
        '<=': lambda a, b: a <= b,
        '>=': lambda a, b: a >= b,
        '>': lambda a, b: a > b,
        '<': lambda a, b: a < b,

        'or': lambda a, b: a or b,
        'and': lambda a, b: a and b}

opn1 = {
    "not": lambda a: not a}

operators2 = frozenset(opn2.keys())
operators1 = frozenset(opn1.keys())

fn = {'len': len,
      'abs': abs,
      'str': str,
      'lower': lambda a: a.lower(),
      'upper': lambda a: a.upper(),
      'date': lambda a: Date.from_iso_8601(a).value,
      'trunc': lambda a: int(a),
      'round': lambda a: int(a + 0.5),
      'sgn': lambda a: ((a < 0 and -1) or (a > 0 and 1) or 0),
      'isnone': lambda a, b: a or b,
      'getattr': lambda a, b: get_attribute(a, [b])}


def prepare(ast):
    prepared = []
    vars = {}
    for cmd in ast:
        cmd_code, args = cmd
        cmd_prep = globals().get('h_%s_prepare' % cmd_code, None)
        if cmd_prep is not None:
            cmd_prepared = cmd_prep(args, vars)
        else:
            cmd_prepared = args
        prepared.append([cmd_code, cmd_prepared])
    return prepared


def execute(prepared, vars, for_object=None):
    result = []
    for cmd in prepared:
        cmd_code, args = cmd
        cmd_handler = globals().get('h_%s' % cmd_code)
        cmd_result = cmd_handler(args, vars, for_object)
        if cmd_result is not None:
            result.append(cmd_result)
    return result


def evaluate_stack(stack, variables, for_object=None):
    if isinstance(stack, list):
        op = stack.pop()
    else:
        op = stack

    if isinstance(op, list):
        prepared = prepare([op])
        return execute(prepared, variables, for_object)[0]

    elif type(op) == types.FunctionType:
        return op(for_object)

    elif isinstance(op, (bytes, str)):
        if op[0] == "'":
            # a string
            return op[1:-1]

        elif op[0] == "$":
            # a variable
            try:
                return variables[op[1:]]
            except KeyError as e:
                raise NameError('Undefined variable "%s"' % e.args[0])

        elif op in operators2:
            op1 = evaluate_stack(stack, variables, for_object)
            if op == 'and' and not op1:
                return False
            elif op == 'or' and op1:
                return True
            op2 = evaluate_stack(stack, variables, for_object)
            return opn2[op](op1, op2)

        elif op in operators1:
            op1 = evaluate_stack(stack, variables, for_object)
            return opn1[op](op1)

        else:
            if op in variables and type(variables[op]) == tuple:
                # an alias or optimized attribute
                alias_stack, objectid, alias_value = variables[op]
                if for_object is not None and objectid != for_object._id:
                    # compute alias
                    alias_value = evaluate_stack(alias_stack[:],
                                                 variables,
                                                 for_object)
                    # write cached value
                    variables[op] = (alias_stack,
                                     for_object._id,
                                     alias_value)
                    return alias_value
                else:
                    # get alias from cache
                    return alias_value
            else:
                # an attribute
                if op == '**':
                    return for_object
                else:
                    if for_object is not None:
                        return get_attribute(for_object, op.split('.'))
    else:
        return op


def get_attribute(obj, name_list):
    try:
        attr_name = name_list.pop(0)
        attr = getattr(obj, attr_name)
        if attr.__class__.__module__ != None.__class__.__module__:
            if isinstance(attr, datatypes.Reference1):
                obj = attr.get_item()
            elif isinstance(attr,
                            (datatypes.ReferenceN, datatypes.Composition)):
                obj = attr.get_items()
            elif isinstance(attr, datatypes.List):
                obj = tuple(attr.value)
            elif isinstance(attr, datatypes.Date):
                obj = attr
            else:
                obj = attr.value
        elif attr_name in ('created', 'modified'):
            obj = Date(attr)
        else:
            obj = attr

        if len(name_list) > 0:
            if isinstance(obj, ObjectSet):
                obj = tuple([get_attribute(item, name_list[:])
                             for item in obj])
            else:
                obj = get_attribute(obj, name_list[:])
        return obj
    except AttributeError:
        return None


def sort_list(list1, list2):
    pairs = list(zip(list1, list2))
    pairs.sort()
    res = [x[1] for x in pairs]
    return res


def compute_aggregate(aggr, lst):
    #print(aggr, list)
    if aggr == 'COUNT':
        return len(lst)
    elif aggr == 'MAX':
        return max(lst)
    elif aggr == 'MIN':
        return min(lst)
    elif aggr == 'SUM':
        return sum(lst)
    elif aggr == 'AVG':
        if lst:
            return sum(lst) / len(lst)
        else:
            return 0
    else:
        # check if list has constant values
        if lst:
            if lst != [lst[0]] * len(lst):
                raise TypeError('Non aggregate expressions should be ' +
                                'constants or included in a GROUP BY clause')
            else:
                return(lst[0])
        return None


#==============================================================================
# unary minus command handler
#==============================================================================

def h_1(params, variables, for_object):
    return(-evaluate_stack(params[:], variables, for_object))


#==============================================================================
# array command handler
#==============================================================================

def h_51(params, variables, for_object):
    l = [evaluate_stack(x[:], variables, for_object) for x in params]
    return l


#==============================================================================
# function command handler
#==============================================================================


def h_60(params, variables, for_object):
    func = fn[params[0]]
    args = params[1]
    #print(args)
    f_args = [evaluate_stack(arg[:], variables, for_object) for arg in args]
    return func(*f_args)


#==============================================================================
# BETWEEN command handler
#==============================================================================

def h_61(params, variables, for_object):
    value, low, high = [evaluate_stack(expr[:], variables, for_object)
                        for expr in params]
    return low <= value < high


#==============================================================================
# IN command handler
#==============================================================================

def h_62(params, variables, for_object):
    value, iterable = [evaluate_stack(expr[:], variables, for_object)
                       for expr in params]
    try:
        return value in iterable
    except TypeError:
        return False


#==============================================================================
# HASATTR command handler
#==============================================================================

def h_63(params, variables, for_object):
    attr_name = evaluate_stack(params[0][:], variables, for_object)
    return hasattr(for_object, attr_name)


#==============================================================================
# SLICE command handler
#==============================================================================

def h_64(params, variables, for_object):
    expression = evaluate_stack(params[0][:], variables, for_object)
    low = evaluate_stack(params[1][:], variables, for_object) or None
    high = evaluate_stack(params[2][:], variables, for_object) or None
    return expression[low:high]


#==============================================================================
# IF command handler
#==============================================================================

def h_65(params, variables, for_object):
    test_expession = evaluate_stack(params[0][:], variables, for_object)
    if test_expession:
        return evaluate_stack(params[1][:], variables, for_object)
    else:
        return evaluate_stack(params[2][:], variables, for_object)


#==============================================================================
# INSTANCEOF command handler
#==============================================================================

def h_66(params, variables, for_object):
    className = evaluate_stack(params[0][:], variables, for_object)
    return isinstance(for_object, misc.get_rto_by_name(className))


#==============================================================================
# GETPARENT command handler
#==============================================================================

def h_67(params, variables, for_object):
    if (params):
        obj = evaluate_stack(params[0][:], variables, for_object)
    else:
        obj = for_object
    return obj.get_parent()


#==============================================================================
# assignment command handler
#==============================================================================

def h_100_prepare(params, variables):
    value = evaluate_stack(params[1][:], variables)
    variables[params[0]] = value
    return [params[0], value]


def h_100(params, variables, for_object):
    variables[params[0]] = params[1]


#==============================================================================
# oql select command handler
#==============================================================================

from porcupine.core.oql import optimizer


def h_200_prepare(params, variables, for_object=None):
    select_fields = params[0][:]

    # get aliases
    aliases = {}
    for expr, alias, aggr in select_fields:
        if expr != alias:
            aliases[alias] = (expr, None, None)

    field_names = [x[1] for x in select_fields]
    expressions = [tuple(x[0::2]) for x in select_fields]

    select_from = params[1]
    for scope in select_from:
        if scope[0] != 2:
            # not a this:... query
            if isinstance(scope[1], list):
                if len(scope[1]) == 1 \
                        and isinstance(scope[1][0], (bytes, str)) \
                        and scope[1][0][0] == '$' \
                        and scope[1][0][1:] not in variables:
                    # parameter
                    scope[1] = scope[1][0]
                else:
                    # expression
                    container_id = evaluate_stack(scope[1], variables,
                                                  for_object)
                    if container_id is not None:
                        scope[1] = container_id
                    else:
                        raise TypeError('OQL scopes should be immutable')

    where_condition = params[2]
    select_range = params[5]

    if params[3]:
        sort_order, order_by = params[3]

        for ind, order_field in enumerate(order_by):
            expr, alias, aggr = order_field
            if alias in aliases:
                order_by[ind] = select_fields[field_names.index(alias)]
            elif expr != alias:
                if (expr, aggr) in expressions:
                    order_by[ind] = select_fields[expressions.index((expr,
                                                                     aggr))]
                else:
                    aliases[alias] = (expr, None, None)
    else:
        order_by = []
        sort_order = None

    group_by = params[4]
    if group_by:
        for ind, group_field in enumerate(group_by):
            expr, alias, aggr = group_field
            if alias in aliases:
                group_by[ind] = select_fields[field_names.index(alias)]
            elif expr != alias:
                if (expr, aggr) in expressions:
                    group_by[ind] = select_fields[expressions.index((expr,
                                                                     aggr))]
                else:
                    aliases[alias] = (expr, None, None)

    if select_fields:
        # add _id in order for set operations work correctly
        # an aggregate type of None will prevent aggregation
        flds = [x[1] for x in select_fields]
        if 'id' not in flds and '_id' not in flds:
            select_fields.append(['_id', '_id', None])
        all_fields = select_fields + order_by + group_by
    else:
        all_fields = [['**', '**', '']] + order_by + group_by

    # optimize field access
    for f in all_fields:
        if type(f[0]) == str \
                and f[0][0] not in "'$" \
                and f[0] != '**' \
                and f[1] not in aliases:
            field_spec = f[0].split('.')
            aliases[f[1]] = (
                eval('[lambda obj: get_attribute(obj, %s)]' % field_spec),
                None, None)

    prepared = {'select_fields': select_fields,
                'field_names': field_names,
                'all_fields': all_fields,
                'select_from': select_from,
                'select_range': select_range,
                'where_condition': where_condition,
                'aliases': aliases,
                'order_by': order_by,
                'sort_order': sort_order,
                'group_by': group_by}

    if for_object is None:
        # not being a subquery
        opt, top, acc, ord = optimizer.optimize(select_from,
                                                where_condition,
                                                order_by,
                                                sort_order,
                                                select_range,
                                                variables)
        prepared['optimized'] = opt
        prepared['select_top'] = top
        prepared['top_accumulative'] = acc
        prepared['order_by'] = ord

    return prepared


def h_200(prepared, variables, for_object=None):
    select_fields = prepared['select_fields']
    field_names = prepared['field_names']
    all_fields = prepared['all_fields']
    select_from = prepared['select_from']
    select_range = prepared['select_range']
    where_condition = prepared['where_condition']
    aliases = prepared['aliases']
    order_by = prepared['order_by']
    sort_order = prepared['sort_order']
    group_by = prepared['group_by']

    variables = variables.copy()
    variables.update(aliases)

    aggregates = [x[2] for x in all_fields]

    #print order_by
    #print len(optimized)
    #print('opt: %s' % optimized)

    results = ObjectSet()
    for deep, object_id in select_from:
        if deep == 2:
            # this:attr
            if not for_object:
                raise TypeError(
                    'Inner scopes using "this:" are valid only in sub-queries')
            if hasattr(for_object, object_id):
                attr = getattr(for_object, object_id)
                if isinstance(attr, (datatypes.ReferenceN,
                                     datatypes.Composition)):
                    ref_objects = attr.get_items()
                elif isinstance(attr, datatypes.Reference1):
                    ref_objects = [attr.get_item()]
                else:
                    raise TypeError('Inner scopes using "this:" are ' +
                                    'valid only ReferenceN, Reference1 ' +
                                    'and Composition data types')
                r = select(for_object._id, False,
                           [[ref_objects, where_condition]],
                           all_fields, variables)
                results |= r
        else:
            # swallow-deep
            if len(object_id) > 0 and object_id[0] == '$':
                # parameter
                try:
                    object_id = variables[object_id[1:]]
                except KeyError as e:
                    raise NameError('Undefined variable "%s"' % e.args[0])

            obj = db.get_item(object_id)
            if obj is not None and obj.isCollection:
                optimized = prepared['optimized']
                select_top = prepared['select_top']
                top_accumulative = prepared['top_accumulative']

                #print(optimized)

                cp_optimized = copy.deepcopy(optimized)
                # create cursors
                for l in cp_optimized:
                    if l[0] is None:
                        l[0] = db._db.get_children(obj._id)
                    else:
                        # replace any given parameters
                        try:
                            for indexed_lookup in l[0]:
                                index_value = indexed_lookup[1]
                                if isinstance(index_value, (bytes, str)) \
                                        and index_value[0] == '$':
                                    # equality cursor
                                    indexed_lookup[1] = \
                                        variables[index_value[1:]]
                                elif isinstance(index_value, tuple):
                                    # range cursor
                                    for limit in index_value:
                                        if isinstance(limit, list) \
                                                and isinstance(limit[0], str) \
                                                and limit[0][0] == '$':
                                            limit[0] = variables[limit[0][1:]]
                        except KeyError as e:
                            raise NameError(
                                'Undefined variable "%s"' % e.args[0])

                        l[0] = db._db.query(l[0])
                        l[0].set_scope(obj._id)

                r = select(obj._id,
                           deep,
                           cp_optimized,
                           all_fields,
                           variables,
                           top=select_top,
                           top_accumulative=top_accumulative)

                # close cursors
                cp_optimized.reverse()
                [l[0].close() for l in cp_optimized]
                results |= r

                if select_top is not None and top_accumulative:
                    if len(results) >= select_top:
                        break

    results = results.to_list()

    if results:
        if group_by:
            if select_fields:
                #construct groups
                group_dict = {}
                igrpstart = len(select_fields) + len(order_by)
                igrpend = igrpstart + len(group_by)
                for rec in results:
                    group_value = tuple(rec[igrpstart:igrpend])
                    group_dict[group_value] = \
                        group_dict.setdefault(group_value, [])
                    group_dict[group_value].append(rec)
                groups = [tuple(g) for g in group_dict.values()]
            else:
                raise TypeError(
                    'GROUP BY clause is incompatible with SELECT *')
        else:
            groups = [results]

        results = []

        if any(aggregates) or group_by:
            for ind, group in enumerate(groups):
                group_sum = []
                for aggr_index, aggr_type in enumerate(aggregates):
                    if aggr_type is not None:
                        # aggregates exclude None values
                        group_sum.append(compute_aggregate(
                            aggr_type,
                            [x[aggr_index]
                             for x in group
                             if x[aggr_index] is not None]))
                groups[ind] = (tuple(group_sum),)

        for group in groups:
            results.extend(group)

        if order_by:
            # extract sort values
            istart = 1
            if select_fields:
                istart = len(select_fields)
            sortlist = tuple([x[istart:istart + len(order_by)]
                              for x in results])
            results = sort_list(sortlist, results)
            # if it is descending reverse the result list
            if not sort_order:
                results.reverse()

    # remove aliases
    for alias in aliases:
        del variables[alias]

    if select_fields:
        schema = field_names
        # truncate to keep only select fields
        iend = len(select_fields)
        results = tuple([x[:iend] for x in results])
    else:
        schema = None
        results = tuple([x[:1][0] for x in results])

    #print(len(results))

    if select_range:
        results = results[slice(select_range[0] - 1, select_range[1])]

    results = ObjectSet(results)
    results.schema = schema
    return results


def select(container_id, deep, specifier, fields, variables,
           top=None, top_accumulative=False):
    results = ObjectSet()
    for iterable, condition in specifier:
        results1 = []
        for item in iterable:
            if condition:
                condition_eval = evaluate_stack(condition[:], variables, item)
            else:
                condition_eval = True
            if condition_eval:
                results1.append(tuple(evaluate_stack(expr[1], variables, item)
                                      for expr in fields))
                if len(specifier) == 1 and \
                        top is not None and \
                        len(results1) == top:
                    #print 'break'
                    break

        results |= ObjectSet(results1)

    if top is not None and top_accumulative:
        if len(results) >= top:
            return results
        top -= len(results)

    if deep:
        subfolders = db._db.query((('isCollection', True), ))
        subfolders.set_scope(container_id)
        for folder in subfolders:
            [l[0].set_scope(folder._id)
             for l in specifier]
            results1 = select(folder._id, deep, specifier,
                              fields, variables, top=top,
                              top_accumulative=top_accumulative)

            results_len = len(results)

            results |= results1

            if top is not None and top_accumulative:
                if len(results) - results_len >= top:
                    break
                top -= results_len
        subfolders.close()

    return results
