import sys

def check_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    in_string = None
    in_comment = False
    in_multiline_comment = False
    
    for line_num, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            if in_multiline_comment:
                if line[i:i+2] == '*/':
                    in_multiline_comment = False
                    i += 1
                i += 1
                continue
            
            if in_string:
                if line[i] == in_string and (i == 0 or line[i-1] != '\\'):
                    in_string = None
                i += 1
                continue
            
            if line[i:i+2] == '//':
                break # Rest of line is comment
            
            if line[i:i+2] == '/*':
                in_multiline_comment = True
                i += 1
                i += 1
                continue
            
            c = line[i]
            if c in "\"'`":
                in_string = c
            elif c in "([{":
                stack.append((c, line_num, i))
            elif c in ")]}":
                opening = {')': '(', ']': '[', '}': '{'}[c]
                if not stack:
                    print(f"Excess closing {c} at line {line_num}:{i}")
                else:
                    last_op, last_line, last_col = stack.pop()
                    if last_op != opening:
                        print(f"Mismatched closing {c} at line {line_num}:{i}. Expected closing for {last_op} from line {last_line}")
            i += 1
            
    if stack:
        print(f"Unclosed brackets:")
        for op, line, col in stack:
            print(f"  {op} at line {line}:{col}")

check_file('src/pages/President/PresidentDeclarations.tsx')
