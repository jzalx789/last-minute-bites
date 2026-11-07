"""Package tracked source only; never include runtime data or credentials."""
from pathlib import Path
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
output = root / 'artifacts' / 'S01G10.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for name in files:
        if not name:
            continue
        path = Path(name)
        if any(part in {'.git', '.data', 'data', 'runtime', 'artifacts', 'node_modules', '.venv', '__pycache__'} for part in path.parts) or path.suffix in {'.db', '.sqlite', '.sqlite3', '.pyc'} or (path.name.startswith('.env') and path.name != '.env.example'):
            raise RuntimeError(f'Refusing to package a runtime/secret file: {name}')
        archive.write(root / name, arcname=str(Path('S01G10') / name))
print(f'Created {output}')
