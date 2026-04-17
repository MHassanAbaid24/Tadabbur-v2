import re

with open("app/routers/auth.py", "r") as f:
    content = f.read()

if "import asyncio" not in content:
    content = content.replace("import logging", "import asyncio\nimport logging", 1)

def replacer(match):
    matched_str = match.group(0)
    without_execute = matched_str.rsplit(".execute()", 1)[0]
    return f"await asyncio.to_thread({without_execute}.execute)"

# Regex: supabase_client\.table\(... until execute() but stop if there are multiple statements
content = re.sub(r'supabase_client\.table\([^\n]*?(?:\n[^\n]*?)*?\.execute\(\)', replacer, content)

with open("app/routers/auth.py", "w") as f:
    f.write(content)
