import sys

def check_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for matched brackets
    brackets = {'(': 0, '[': 0, '{': 0}
    quotes = {'"': 0, "'": 0, '`': 0}
    
    in_comment = False
    in_string = None # None, ", ', `
    
    i = 0
    while i < len(content):
        c = content[i]
        
        if in_string:
            if c == in_string and content[i-1] != '\\':
                in_string = None
            i += 1
            continue
            
        if content[i:i+2] == '//':
            # Skip until newline
            while i < len(content) and content[i] != '\n':
                i += 1
            continue
            
        if content[i:i+2] == '/*':
            i += 2
            while i < len(content) and content[i:i+2] != '*/':
                i += 1
            i += 2
            continue
            
        if c in quotes:
            in_string = c
            i += 1
            continue
            
        if c in '([{':
            brackets[c] += 1
        elif c in ')]}':
            opening = {'-':'-', ')': '(', ']': '[', '}': '{'}[c]
            brackets[opening] -= 1
            if brackets[opening] < 0:
                print(f"Excess closing {c} at index {i}")
        
        i += 1
    
    for b, count in brackets.items():
        if count != 0:
            print(f"Unmatched {b}: {count}")

check_file('src/pages/President/PresidentDeclarations.tsx')
