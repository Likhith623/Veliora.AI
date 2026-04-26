import os

def replace_in_files(directory, replacements):
    for root, dirs, files in os.walk(directory):
        # skip node_modules, .git
        if 'node_modules' in root or '.git' in root or '.next' in root:
            continue
        for file in files:
            if not file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.yaml', '.md', 'Dockerfile', 'page.tsx', 'layout.tsx', 'globals.css', 'cloudbuild.yaml', 'tailwind.config.js')):
                if file not in ('Dockerfile', 'cloudbuild.yaml'):
                    continue
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                continue
            
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

replacements = {
    "Familia": "Veliora.AI",
    "FAMILIA": "VELIORA.AI"
}

replace_in_files("/Users/likhith./Veliora.AI_backend./realtime_frontend", replacements)
