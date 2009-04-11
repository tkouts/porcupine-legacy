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

operators2 = opn2.keys()
operators1 = opn1.keys()

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
    'getattr' : lambda a,b: getAttribute(a, [b])
}

def evaluateStack(stack, variables, forObject=None):
    try:
        op = stack.pop()
    except AttributeError:
        op = stack

    if op in operators2:
        op1 = evaluateStack(stack, variables, forObject)
        if op=='and' and not op1:
            return False
        elif op=='or' and op1:
            return True
        op2 = evaluateStack(stack, variables, forObject)
        return opn2[op](op1,op2)

    elif op in operators1:
        op1 = evaluateStack(stack, variables, forObject)
        return opn1[op](op1)

    elif isinstance(op, str):
        if op[0]=="'":
            # a string
            return op[1:-1]
        else:
            if variables.has_key(op):
                var = variables[op]
                if not isinstance(var, tuple):
                    # a variable
                    return var
                else:
                    # an alias
                    alias_stack, objectid, alias_value = var
                    if objectid != forObject._id:
                        alias_value = evaluateStack(alias_stack[:], variables,
                                                    forObject)
                        variables[op] = (alias_stack, forObject._id,
                                         alias_value)
                        return alias_value
                    else:
                        # get alias from cache
                        return alias_value
            else:
                # an attribute
                if op == '**':
                    return forObject
                else:
                    return getAttribute(forObject, op.split('.'))

    elif isinstance(op, list):
        cmdCode = op[0]
        cmdHandlerFunc = globals()['h_' + str(cmdCode)]
        return(cmdHandlerFunc(op[1], variables, forObject))

    else:
        return op
        
def getAttribute(obj, name_list):
    try:
        attr = name_list.pop(0)
        oAttr = getattr(obj, attr) 
        if isinstance(oAttr, datatypes.DataType):
            if isinstance(oAttr, datatypes.Reference1):
                obj = oAttr.get_item()
            elif isinstance(oAttr, datatypes.ReferenceN) or \
                    isinstance(oAttr, datatypes.Composition):
                obj = oAttr.get_items()
            elif isinstance(oAttr, datatypes.Date):
                obj = oAttr
            else:
                obj = oAttr.value
        elif attr in ('created', 'modified'):
            obj = Date(oAttr)
        else:
            obj = oAttr
        
        if len(name_list):
            if isinstance(obj, list):
                obj = [getAttribute(item, name_list[:]) for item in obj]
            else:
                obj = getAttribute(obj, name_list[:])
        
        return obj
    except AttributeError:
        return None
        
def sortList(list1, list2):
    pairs = zip(list1, list2)
    pairs.sort()
    res = [x[1] for x in pairs]
    return res

def computeAggregate(aggr, lst):
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

#================================================================================
# unary minus command handler
#================================================================================

def h_1(params, variables, forObject):
    return(-evaluateStack(params[:], variables, forObject))

#================================================================================
# array command handler
#================================================================================
    
def h_51(params, variables, forObject):
    l = [evaluateStack(x[:], variables, forObject) for x in params]
    return l

#================================================================================
# function command handler
#================================================================================

def h_60(params, variables, forObject):
    func = fn[params[0]]
    args = params[1]
    #print args
    f_args = [evaluateStack(arg[:], variables, forObject) for arg in args]
    return func(*f_args)

#================================================================================
# BETWEEN command handler
#================================================================================

def h_61(params, variables, forObject):
    value, low, high = [evaluateStack(expr[:], variables, forObject)
                        for expr in params]
    return(low < value < high)

#================================================================================
# IN command handler
#================================================================================

def h_62(params, variables, forObject):
    value, iterable = [evaluateStack(expr[:], variables, forObject)
                       for expr in params]
    try:
        return value in iterable
    except TypeError:
        return False

#================================================================================
# HASATTR command handler
#================================================================================

def h_63(params, variables, forObject):
    attrName = evaluateStack(params[0][:], variables, forObject)
    return hasattr(forObject, attrName)

#================================================================================
# SLICE command handler
#================================================================================

def h_64(params, variables, forObject):
    expression = evaluateStack(params[0][:], variables, forObject)
    low = evaluateStack(params[1][:], variables, forObject) or None
    high = evaluateStack(params[2][:], variables, forObject) or None
    if type(expression)==str:
        return unicode(expression, 'utf-8')[low:high].encode('utf-8')
    else:
        return expression[low:high]

#================================================================================
# IF command handler
#================================================================================

def h_65(params, variables, forObject):
    test_expession = evaluateStack(params[0][:], variables, forObject)
    if test_expession:
        return evaluateStack(params[1][:], variables, forObject)
    else:
        return evaluateStack(params[2][:], variables, forObject)
        
#================================================================================
# INSTANCEOF command handler
#================================================================================
def h_66(params, variables, forObject):
    className = evaluateStack(params[0][:], variables, forObject)
    return isinstance(forObject, misc.get_rto_by_name(className))

#================================================================================
# GETPARENT command handler
#================================================================================
def h_67(params, variables, forObject):
    if (params):
        obj = evaluateStack(params[0][:], variables, forObject)
    else:
        obj = forObject
    return obj.get_parent()

#================================================================================
# assignment command handler
#================================================================================
       
def h_100(params, variables):
    variables[params[0]] = evaluateStack(params[1][:], variables)

#================================================================================
# oql select command handler
#================================================================================

def select(deep, children, fields, condition, variables):
    results = []
    for child in children:
        if condition:
            res = evaluateStack(condition[:], variables, child)
        else:
            res = True
        
        if res:
            fieldlist = [evaluateStack(expr[1], variables, child)
                         for expr in fields]
            results.append(tuple(fieldlist))
            
        if deep and child.isCollection:
            results1 = select(deep, child.get_children(), fields,
                              condition, variables)
            results.extend(results1)
    
    return (results)

def h_200(params, variables, forObject = None):
    select_fields = params[0]
    
    # get aliases
    aliases = []
    for expr, alias, aggr in select_fields:
        if expr != alias:
            variables[alias] = (expr, None, None)
            aliases.append(alias)

    field_names = [ x[1] for x in select_fields ]
    expressions = [ tuple(x[0::2]) for x in select_fields ]
    
    select_from = params[1]
    where_condition = params[2]
    
    if params[3]:
        sort_order, order_by = params[3]
        
        for ind, order_field in enumerate(order_by):
            expr, alias, aggr = order_field
            if alias in aliases:
                order_by[ind] = select_fields[ field_names.index(alias) ]
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
    
    aggregates = [x[2] for x in all_fields]
    results = []
    
    for deep, object_id in select_from:
        if deep==2:
            # this:attr
            if not forObject:
                raise TypeError, \
                    'Inner scopes using "this:" are valid only in sub-queries'
            if hasattr(forObject, object_id):
                attr = getattr(forObject, object_id)
                if isinstance(attr, (datatypes.ReferenceN,
                                     datatypes.Composition)):
                    refObjects = attr.get_items()
                elif isinstance(attr, datatypes.Reference1):
                    refObjects = [attr.get_item()]
                else:
                    raise TypeError, ('Inner scopes using "this:" are ' +
                                      'valid only ReferenceN or Reference1 ' +
                                      'data types')
                r = select(False, refObjects, all_fields,
                           where_condition, variables)
                results.extend(r)
        else:
            # swallow-deep
            obj = db.get_item(object_id)
            if obj != None and obj.isCollection:
                children = obj.get_children()
                r = select(deep, children, all_fields,
                           where_condition, variables)
                results.extend(r)
    #print results
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
                    group_sum.append(computeAggregate(
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
            results = sortList(sortlist, results)
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
        
#    print results

    return ObjectSet(tuple(results), schema)


