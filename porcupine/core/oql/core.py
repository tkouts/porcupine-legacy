#===============================================================================
#    Copyright 2005-2009, Tassos Koutsovassilis
#
#    This file is part of Porcupine.
#    Porcupine is free software; you can redistribute it and/or modify
#    it under the terms of the GNU Lesser General Public License as published by
#    the Free Software Foundation; either version 2.1 of the License, or
#    (at your option) any later version.
#    Porcupine is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Lesser General Public License for more details.
#    You should have received a copy of the GNU Lesser General Public License
#    along with Porcupine; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#===============================================================================
"""
OQL Core Interpreter
"""
import types

from porcupine import datatypes
from porcupine import db
from porcupine.core.objectSet import ObjectSet
from porcupine.utils.date import Date
from porcupine.utils import misc

NEG         = 1

ARRAY       = 51

FUNCTION    = 60
BETWEEN     = 61
IN          = 62
HASATTR     = 63
SLICE       = 64
IF          = 65
INSTANCEOF  = 66
GETPARENT   = 67

CMD_ASSIGN  = 100
OQL_SELECT  = 200

# map operator symbols to corresponding operations
opn2 = { 
    '+' : lambda a,b: a + b,
    '-' : lambda a,b: a - b,
    '*' : lambda a,b: a * b,
    '/' : lambda a,b: a / b,
    '^' : lambda a,b: a ** b,
    
    '=' : lambda a,b: a == b,
    '<>' : lambda a,b: a != b,
    '<=' : lambda a,b: a <= b,
    '>=' : lambda a,b: a >= b,
    '>' : lambda a,b: a > b,
    '<' : lambda a,b: a < b,

    'or' : lambda a,b: a or b,
    'and' : lambda a,b: a and b,
}

opn1 = {
    "not": lambda a: not a
}

operators2 = frozenset(opn2.keys())
operators1 = frozenset(opn1.keys())

fn  = {
    'len' : len,
    'abs' : abs,
    'str' : str,
    'lower' : lambda a: a.lower(),
    'upper' : lambda a: a.upper(),
    'date' : lambda a: Date.from_iso_8601(a),
    'trunc' : lambda a: int(a),
    'round' : lambda a: int(a+0.5),
    'sgn' : lambda a: ( (a<0 and -1) or (a>0 and 1) or 0 ),
    'isnone' : lambda a,b: a or b,
    'getattr' : lambda a,b: get_attribute(a, [b])
}

def evaluate_stack(stack, variables, for_object=None):
    try:
        op = stack.pop()
    except AttributeError:
        op = stack

    if type(op) == list:
        cmd_code = op[0]
        handler = globals()['h_%s' % cmd_code]
        return handler(op[1], variables, for_object)

    elif type(op) == types.FunctionType:
        return op(for_object)

    elif type(op) == str:
        if op[0] == "'":
            # a string
            return op[1:-1]

        elif op[0] == "$":
            # a variable
            return variables[op[1:]]

        elif op in operators2:
            op1 = evaluate_stack(stack, variables, for_object)
            if op == 'and' and not op1:
                return False
            elif op == 'or' and op1:
                return True
            op2 = evaluate_stack(stack, variables, for_object)
            return opn2[op](op1,op2)

        elif op in operators1:
            op1 = evaluate_stack(stack, variables, for_object)
            return opn1[op](op1)

        else:
            if variables.has_key(op) and type(variables[op]) == tuple:
                # an alias or optimized attribute
                alias_stack, objectid, alias_value = variables[op]
                if objectid != for_object._id:
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
                    if for_object != None:
                        return get_attribute(for_object, op.split('.'))
    else:
        return op
        
def get_attribute(obj, name_list):
    try:
        attr_name = name_list.pop(0)
        attr = getattr(obj, attr_name)
        if attr.__class__.__module__ != '__builtin__':
            if isinstance(attr, datatypes.Reference1):
                obj = attr.get_item()
            elif isinstance(attr,
                            (datatypes.ReferenceN, datatypes.Composition)):
                obj = attr.get_items()
            elif isinstance(attr, datatypes.Date):
                obj = attr
            else:
                obj = attr.value
        elif attr_name in ('created', 'modified'):
            obj = Date(attr)
        else:
            obj = attr
        
        if len(name_list) > 0:
            if type(obj) == list:
                obj = [get_attribute(item, name_list[:]) for item in obj]
            else:
                obj = get_attribute(obj, name_list[:])
        
        return obj
    except AttributeError:
        return None
        
def sort_list(list1, list2):
    pairs = zip(list1, list2)
    pairs.sort()
    res = [x[1] for x in pairs]
    return res

def compute_aggregate(aggr, lst):
    #print aggr, list
    if aggr=='COUNT':
        return len(lst)
    elif aggr=='MAX':
        return max(lst)
    elif aggr=='MIN':
        return min(lst)
    elif aggr=='SUM':
        return sum(lst)
    elif aggr=='AVG':
        if lst:
            return sum(lst)/len(lst)
        else:
            return 0
    else:
        # check if list has constant values
        if lst:
            if lst != [lst[0]] * len(lst):
                raise TypeError, ('Non aggregate expressions should be ' +
                                  'constants or included in a GROUP BY clause')
            else:
                return(lst[0])
        return None

#===============================================================================
# unary minus command handler
#===============================================================================

def h_1(params, variables, for_object):
    return(-evaluate_stack(params[:], variables, for_object))

#===============================================================================
# array command handler
#===============================================================================
    
def h_51(params, variables, for_object):
    l = [evaluate_stack(x[:], variables, for_object) for x in params]
    return l

#===============================================================================
# function command handler
#===============================================================================

def h_60(params, variables, for_object):
    func = fn[params[0]]
    args = params[1]
    #print args
    f_args = [evaluate_stack(arg[:], variables, for_object) for arg in args]
    return func(*f_args)

#===============================================================================
# BETWEEN command handler
#===============================================================================

def h_61(params, variables, for_object):
    value, low, high = [evaluate_stack(expr[:], variables, for_object)
                        for expr in params]
    return(low < value < high)

#===============================================================================
# IN command handler
#===============================================================================

def h_62(params, variables, for_object):
    value, iterable = [evaluate_stack(expr[:], variables, for_object)
                       for expr in params]
    try:
        return value in iterable
    except TypeError:
        return False

#===============================================================================
# HASATTR command handler
#===============================================================================

def h_63(params, variables, for_object):
    attrName = evaluate_stack(params[0][:], variables, for_object)
    return hasattr(for_object, attrName)

#===============================================================================
# SLICE command handler
#===============================================================================

def h_64(params, variables, for_object):
    expression = evaluate_stack(params[0][:], variables, for_object)
    low = evaluate_stack(params[1][:], variables, for_object) or None
    high = evaluate_stack(params[2][:], variables, for_object) or None
    if type(expression)==str:
        return unicode(expression, 'utf-8')[low:high].encode('utf-8')
    else:
        return expression[low:high]

#===============================================================================
# IF command handler
#===============================================================================

def h_65(params, variables, for_object):
    test_expession = evaluate_stack(params[0][:], variables, for_object)
    if test_expession:
        return evaluate_stack(params[1][:], variables, for_object)
    else:
        return evaluate_stack(params[2][:], variables, for_object)
        
#===============================================================================
# INSTANCEOF command handler
#===============================================================================
def h_66(params, variables, for_object):
    className = evaluate_stack(params[0][:], variables, for_object)
    return isinstance(for_object, misc.get_rto_by_name(className))

#===============================================================================
# GETPARENT command handler
#===============================================================================
def h_67(params, variables, for_object):
    if (params):
        obj = evaluate_stack(params[0][:], variables, for_object)
    else:
        obj = for_object
    return obj.get_parent()

#===============================================================================
# assignment command handler
#===============================================================================
       
def h_100(params, variables):
    variables[params[0]] = evaluate_stack(params[1][:], variables)

#===============================================================================
# oql select command handler
#===============================================================================

def select(container_id, deep, iterable, fields, condition, variables):
    results = []
    if condition:
        results = [tuple(evaluate_stack(expr[1], variables, item)
                         for expr in fields)
                   for item in iterable
                   if evaluate_stack(condition[:], variables, item)]
    else:
        results = [tuple(evaluate_stack(expr[1], variables, item)
                         for expr in fields)
                   for item in iterable]

    if deep:
        subfolders = db._db.join((('_parentid', container_id),
                                  ('isCollection', True)))
        for folder in subfolders:
            cursor = iterable.duplicate()
            db._db.switch_cursor_scope(cursor, folder._id)
            results1 = select(folder._id, deep, cursor, fields, condition,
                              variables)
            cursor.close()
            results.extend(results1)
        subfolders.close()
    
    return results

def optimize_query(conditions, variables):
    indexes = []
    if len(conditions) == 3 \
            and db._db.has_index(conditions[1]) \
            and conditions[2] in ['=', '<', '>', '<=', '>=']:
        index_value = evaluate_stack(conditions[0], variables)
        if index_value != None:
            if conditions[2] == '=':
                indexes.append((conditions[1], index_value))
            elif conditions[2] == '<':
                indexes.append((conditions[1],
                               (None, (index_value, False))))
            elif conditions[2] == '<=':
                indexes.append((conditions[1],
                               (None, (index_value, True))))
            elif conditions[2] == '>':
                indexes.append((conditions[1],
                               ((index_value, False), None)))
            elif conditions[2] == '>=':
                indexes.append((conditions[1],
                               ((index_value, True), None)))
            conditions = []
    #print indexes
    return indexes, conditions

def h_200(params, variables, for_object=None):
    select_fields = params[0]
    
    # get aliases
    aliases = []
    for expr, alias, aggr in select_fields:
        if expr != alias:
            variables[alias] = (expr, None, None)
            aliases.append(alias)

    field_names = [x[1] for x in select_fields]
    expressions = [tuple(x[0::2]) for x in select_fields]
    
    select_from = params[1]
    where_condition = params[2]
    
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
                    variables[alias] = (expr, None, None)
                    aliases.append(alias)
    else:
        order_by = []

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
                    variables[alias] = (expr, None, None)
                    aliases.append(alias)

    if select_fields:
        all_fields = select_fields + order_by + group_by
    else:
        all_fields = [['**', '**', '']] + order_by + group_by

    # optimize field access
    for f in all_fields:
        if type(f[0]) == str and f[0][0]!= "'" \
                and f[0][0]!='$' and f[0] != '**':
            field_spec = f[0].split('.')
            variables[f[1]] = (
                eval('[lambda x: get_attribute(x, %s)]' % field_spec),
                None, None)
    
    aggregates = [x[2] for x in all_fields]
    results = []

    #print where_condition
    if for_object == None:
        # in case of not being a subquery, optimize query
        indexed_lookups, where_condition = \
            optimize_query(where_condition[:], variables)
    
    for deep, object_id in select_from:
        if deep==2:
            # this:attr
            if not for_object:
                raise TypeError, \
                    'Inner scopes using "this:" are valid only in sub-queries'
            if hasattr(for_object, object_id):
                attr = getattr(for_object, object_id)
                if isinstance(attr, (datatypes.ReferenceN,
                                     datatypes.Composition)):
                    ref_objects = attr.get_items()
                elif isinstance(attr, datatypes.Reference1):
                    ref_objects = [attr.get_item()]
                else:
                    raise TypeError, ('Inner scopes using "this:" are ' +
                                      'valid only ReferenceN, Reference1 ' +
                                      'and Composition data types')
                r = select(for_object._id, False, ref_objects, all_fields,
                           where_condition, variables)
                results.extend(r)
        else:
            # swallow-deep
            obj = db.get_item(object_id)
            if obj != None and obj.isCollection:
                if deep and obj._id == '':
                    deep = False
                    scope_condition = []
                else:
                    scope_condition = [('_parentid', obj._id)]
                
                if len(indexed_lookups) == 0:
                    #print 'not using index'
                    if scope_condition == []:
                        # deep traversal of root without index
                        scope_condition = [('displayName', (None, None))]
                    cursor = db._db.query_index(*scope_condition[0])
                else:
                    #print 'using index'
                    if len(indexed_lookups) == 1 and not scope_condition:
                        cursor = db._db.query_index(*indexed_lookups[0])
                    else:
                        cursor = db._db.join(indexed_lookups + scope_condition)

                r = select(obj._id, deep, cursor, all_fields, where_condition,
                           variables)
                cursor.close()
                results.extend(r)
    
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
                raise TypeError, \
                    'GROUP BY clause is incompatible with SELECT *'
        else:
            groups = [results]
        
        #print len(groups)
        results = []
        
        if aggregates != [''] * len(aggregates) or group_by:
            for ind, group in enumerate(groups):
                group_sum = []
                for aggr_index, aggr_type in enumerate(aggregates):
                    # aggregates exclude None values
                    group_sum.append(compute_aggregate(
                        aggr_type,
                        [x[aggr_index]
                         for x in group
                         if x[aggr_index] != None]))
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
            if not sort_order: results.reverse()
    
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
    
    return ObjectSet(results, schema)
