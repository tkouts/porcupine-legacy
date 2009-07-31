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
OQL Parser
"""
from porcupine.core import cache
from porcupine.core.yacc import lex, yacc
from porcupine.core.oql import core

QUERY_CACHE = cache.Cache(100)

reserved = (
#===============================================================================
# oql statements
#===============================================================================
    'SET',
    'SELECT', 'AS', 'FROM', 'WHERE', 'ORDER', 'GROUP', 'BY',
    'IF','THEN','ELSE', 
    'ASC', 'DESC',
#===============================================================================
# scope operators
#===============================================================================
    'SHALLOW', 'DEEP', 'THIS',
#===============================================================================
# boolean operators
#===============================================================================
    'AND', 'OR', 'NOT',
#===============================================================================
# membership tests
#===============================================================================
    'IN', 'BETWEEN', 'HASATTR',
#===============================================================================
# aggregate functions
#===============================================================================
    'MAX', 'MIN', 'AVG', 'SUM', 'COUNT',
#===============================================================================
# range functions
#===============================================================================
    'SLICE',
#===============================================================================
# object functions
#===============================================================================
    'INSTANCEOF', 'GETPARENT'
)

functions = (
#===============================================================================
# arithmetic functions
#===============================================================================
    'len', 'abs', 'trunc', 'round' , 'sgn',
#===============================================================================
# value testing
#===============================================================================
    'isnone',
#===============================================================================
# conversion functions
#===============================================================================
    'str', 'date', 'lower', 'upper',
#===============================================================================
# object functions
#===============================================================================
    'getattr'
)

reserved_map = {}
for r in reserved:
    reserved_map[r.lower()] = r

tokens = reserved + (
    'COMMENT', 'COLON',

    'COMMA', 'FUNCTION',
    
    'EQ', 'NE', 'GT', 'GE', 'LT', 'LE',
    
    'PLUS','MINUS','TIMES','DIVIDE',
    
    'BOOLEAN',
    
    'EXP',
    
    'LPAREN','RPAREN', 'LSB', 'RSB',

    'INT', 'FLOAT', 'NAME', 'STRING',
)
    
# Tokens
t_COLON             = r':'
t_COMMA             = r','
t_STRING            = r'\'([^\\\n]|(\\.))*?\''
    
#===============================================================================
# comparison operators
#===============================================================================
    
t_EQ               = r'='
t_GT               = r'>'
t_GE               = r'>='
t_LT               = r'<'
t_LE               = r'<='
t_NE               = r'<>'

#===============================================================================
# binary arithmetic operators
#===============================================================================

t_PLUS             = r'\+'
t_MINUS            = r'-'
t_TIMES            = r'\*'
t_DIVIDE           = r'/'
    
#===============================================================================
# unary arithmetic operators
#===============================================================================
    
t_EXP              = r'\^'
    
#===============================================================================
# grouping operators
#===============================================================================
    
t_LPAREN           = r'\('
t_RPAREN           = r'\)'
    
#===============================================================================
# array operators
#===============================================================================
    
t_LSB             = r'\['
t_RSB             = r'\]'

t_ignore = " \t\r"

#===============================================================================
# token definitions
#===============================================================================

def t_COMMENT(t):
    r'--[^\n]*'
    return

def t_BOOLEAN(t):
    r'true|false'
    t.value = (t.value=='true')
    return t

def t_FLOAT(t):
    r'(\d+)(\.\d+)(e(\+|-)?(\d+))?'
    t.value = float(t.value)
    return t

def t_INT(t):
    r'\d+'
    t.value = int(t.value)
    return t

def t_NAME(t):
    r'[A-Za-z_$][\w_.]*'
    if t.value.lower() in functions:
        t.type = 'FUNCTION'
        t.value = t.value.lower()
    else:
        t.type = reserved_map.get(t.value.lower(), "NAME")
    return t
    
def t_newline(t):
    r'\n+'
    t.lineno += t.value.count("\n")

def t_error(t):
    raise SyntaxError('', t.lineno, t.value[0])#, hex(ord(t.value[0])),)


class OqlParser:
    precedence = (
        ('left', 'OR'),
        ('left', 'AND'),
        ('left', 'NOT'),
        ('left', 'IN', 'BETWEEN'),
        ('left', 'EQ', 'GT', 'GE', 'LT', 'LE', 'NE'),
        ('left', 'PLUS', 'MINUS'),
        ('left', 'TIMES', 'DIVIDE'),
        ('left', 'EXP'),
        ('right', 'UMINUS'),
    )

    def __init__(self, debug=0):
        self.debug = debug
        self.debugfile = "parser.out"
        self.tabmodule = "oql_parsetab"

        self.expr_index = 0
        self.tokens = tokens

    def parse(self, command):
        if command in QUERY_CACHE:
            return QUERY_CACHE[command]
        else:
            my_lexer = lex.lex(optimize=1, debug=self.debug)
            my_yacc = yacc.yacc(module=self,
                                debug=self.debug,
                                debugfile=self.debugfile,
                                tabmodule=self.tabmodule)
            my_lexer.input(command)
            ast = my_yacc.parse(lexer=my_lexer)
            QUERY_CACHE[command] = ast
            return ast
        
#===============================================================================
# OQL PARSER RULES
#===============================================================================

#===============================================================================
# oql script grammar
#===============================================================================

    def p_oqlscript(self, p):
        'oqlscript : statement'
        p[0] = [p[1]]
        
    def p_oqlscript_with_statements(self, p):
        'oqlscript : oqlscript statement'
        p[0] = p[1] + [p[2]]

#===============================================================================
# statement grammar
#===============================================================================

    def p_statement_assign(self, p):
        'statement : SET NAME EQ expression'
        p[0] = [ core.CMD_ASSIGN, [p[2]] + [p[4]] ]

    def p_statement_oqlstatement(self, p):
        'statement : select_statement'
        p[0] =  p[1]

#===============================================================================
# select statement grammar
#===============================================================================

    def p_select_statement_1(self, p):
        '''
        select_statement : SELECT TIMES FROM object_list
                        | SELECT select_list FROM object_list
        '''
        # [select_fields, scopes, where_condition, order_by, group_by]
        if p[2]=='*':
            p[0] = [ core.OQL_SELECT, [ [], p[4], [], [], [] ] ]
        else:
            p[0] = [ core.OQL_SELECT, [ p[2], p[4], [], [], [] ] ]

    def p_select_statement_2(self, p):
        'select_statement : select_statement WHERE expression'
        p[1][1][2] = p[3]
        p[0] = p[1]

    def p_select_statement_3(self, p):
        '''
        select_statement : select_statement ORDER BY field_list ASC
                        | select_statement ORDER BY field_list DESC
        '''
        p[1][1][3] = (p[5].upper()=='ASC', p[4])
        p[0] = p[1]
    
    def p_select_statement_4(self, p):
        'select_statement : select_statement GROUP BY field_list'
        p[1][1][4] = p[4]
        p[0] = p[1]

#===============================================================================
# field specifier grammar
#===============================================================================

    def p_fieldspec_1(self, p):
        'fieldspec : NAME'
        p[0] = [ p[1], p[1], '' ]

    def p_fieldspec_2(self, p):
        'fieldspec : expression'
        p[0] = [p[1], 'expr' + str(self.expr_index), '']
        self.expr_index += 1
        
    def p_fieldspec_3(self, p):
        'fieldspec : LPAREN IF expression THEN expression ELSE expression RPAREN'
        p[0] = [ [ [core.IF, [p[3], p[5], p[7]] ] ],
                    'expr' + str(self.expr_index), '' ]
        self.expr_index += 1

    def p_fieldspec_4(self, p):
        '''
        fieldspec : MIN LPAREN fieldspec RPAREN
                 | MAX LPAREN fieldspec RPAREN
                 | AVG LPAREN fieldspec RPAREN
                 | SUM LPAREN fieldspec RPAREN
                 | COUNT LPAREN fieldspec RPAREN
        '''
        p[3][2] = p[1].upper()
        p[3][1] = 'expr' + str(self.expr_index)
        self.expr_index += 1
        p[0] = p[3]

#===============================================================================
# alias grammar
#===============================================================================

    def p_alias(self, p):
        'alias : fieldspec AS NAME'
        p[1][1] = p[3]
        p[0] = p[1]

#===============================================================================
# select field grammar
#===============================================================================
 
    def p_selectfield(self, p):
        '''
        select_field : fieldspec
                    | alias
        '''
        p[0] = p[1]
        
#===============================================================================
# select list grammar
#===============================================================================

    def p_selectlist_1(self, p):
        'select_list : select_field'
        p[0] = [p[1]]
    
    def p_selectlist_2(self, p):
        'select_list : select_list COMMA select_field'
        p[1].append(p[3])
        p[0] = p[1]

#===============================================================================
# field list grammar
#===============================================================================

    def p_fieldlist_1(self, p):
        'field_list : fieldspec'
        p[0] = [p[1]]
    
    def p_fieldlist_2(self, p):
        'field_list : field_list COMMA fieldspec'
        p[1].append(p[3])
        p[0] = p[1]

#===============================================================================
# scope grammar
#===============================================================================
    def p_scope_1(self, p):
        'scope : STRING'
        p[0] = (0, p[1][1:-1])

    def p_scope_2(self, p):
        """
        scope : SHALLOW LPAREN STRING RPAREN
             | DEEP LPAREN STRING RPAREN
        """
#        print p.type
        p[0] = (int(p[1].upper()=='DEEP'), p[3][1:-1])
        
    def p_scope_3(self, p):
        """
        scope : THIS COLON NAME
        """
        p[0] = (2, p[3])

#===============================================================================
# object list grammar
#===============================================================================

    def p_objectlist_1(self, p):
        """
        object_list : scope
        """
        p[0] = [p[1]]
    
    def p_objectlist_2(self, p):
        'object_list : object_list COMMA scope'
        p[1].append(p[3])
        p[0] = p[1]

#===============================================================================
# array grammar
#===============================================================================

    def p_array_1(self, p):
        'array : LSB expression_list RSB'
        p[0] = [ [core.ARRAY, p[2]] ]

#===============================================================================
# expression list grammar
#===============================================================================

    def p_expressionlist_1(self, p):
        'expression_list : expression'
        p[0] = [ p[1] ]
    
    def p_expressionlist_2(self, p):
        'expression_list : expression_list COMMA expression'
        p[1].append(p[3])
        p[0]=p[1]
        
#===============================================================================
# function grammar
#===============================================================================
    def p_expression_slice(self, p):
        'expression : SLICE LPAREN expression COMMA expression COMMA expression RPAREN'
        p[0] = [ [ core.SLICE, [p[3], p[5], p[7]] ] ]

    def p_expression_hasattr(self, p):
        'expression : HASATTR LPAREN expression RPAREN'
        p[0] = [ [ core.HASATTR, [p[3]] ] ]

    def p_expression_between(self, p):
        'expression : expression BETWEEN expression AND expression'
        p[0] = [ [ core.BETWEEN, [p[1], p[3], p[5]] ] ]

    def p_expression_in(self, p):
        'expression : expression IN expression'
        p[0] = [ [ core.IN, [p[1], p[3]] ] ]
    
    def p_expression_instanceof(self, p):
        'expression : INSTANCEOF LPAREN expression RPAREN'
        p[0] = [ [ core.INSTANCEOF, [p[3]] ] ]
        
    def p_expression_getparent_1(self, p):
        'expression : GETPARENT LPAREN expression RPAREN'
        p[0] = [ [ core.GETPARENT, [p[3]] ] ]
    
    def p_expression_getparent_2(self, p):
        'expression : GETPARENT LPAREN RPAREN'
        p[0] = [ [ core.GETPARENT, [] ] ]
        
#===============================================================================
# logical expression grammar
#===============================================================================
    def p_expression_boolean_1(self, p):
        """
        expression : expression OR expression
                  | expression AND expression
        """
        p[3].extend(p[1])
        p[3].extend([p[2]])
        p[0] = p[3]

    def p_expression_boolean_2(self, p):
        """
        expression : NOT expression
        """
        p[2].extend([p[1]])
        p[0] = p[2]
        
    def p_expression_comparison(self,p):
        """
        expression : expression EQ expression
                  | expression NE expression
                  | expression GT expression
                  | expression GE expression
                  | expression LT expression
                  | expression LE expression
        """
        p[3].extend(p[1])
        p[3].extend([p[2]])
        p[0] = p[3]

    def p_expression_binary(self, p):
        """
        expression : expression PLUS expression
                  | expression MINUS expression
                  | expression TIMES expression
                  | expression DIVIDE expression
                  | expression EXP expression
        """
        p[3].extend(p[1])
        p[3].extend([p[2]])
        p[0] = p[3]

    def p_expression_uminus(self, p):
        'expression : MINUS expression %prec UMINUS'
        try:
            p[0] = -p[2]
        except:
            p[0] = [ [core.NEG, p[2]] ]

    def p_expression_function(self, p):
        'expression : FUNCTION LPAREN expression_list RPAREN'
        p[0] = [ [ core.FUNCTION, [p[1], p[3]] ] ]

    def p_expression_group(self, p):
        'expression : LPAREN expression RPAREN'
        p[0] = p[2]

    def p_expression_select(self, p):
        'expression : LPAREN select_statement RPAREN'
        p[0] = [p[2]]
        #self.expr_index += 1

    def p_expression_array(self, p):
        'expression : array'
        p[0] = p[1]

    def p_expression_string(self, p):
        'expression : STRING'
        p[0] = [p[1]]

    def p_expression_number(self, p):
        """
        expression : INT
                  | FLOAT
        """
        p[0] = [p[1]]

    def p_expression_name(self, p):
        'expression : NAME'
        p[0] = [p[1]]

    def p_expression_bool(self, p):
        'expression : BOOLEAN'
#        print p[1]
        p[0] = [p[1]]

    def p_error(self, p):
        if p is not None:
            raise SyntaxError('', p.lineno, p.value)
        else:
            raise SyntaxError('', 0, '')
