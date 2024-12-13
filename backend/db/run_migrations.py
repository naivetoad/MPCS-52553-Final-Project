import sqlite3
import os
from pathlib import Path

def run_migrations():
    # Connect to database (creates it if it doesn't exist)
    conn = sqlite3.connect('database.sqlite3')
    cursor = conn.cursor()
    
    # Get migration files from the migrations directory
    migration_dir = Path('migrations')
    migration_files = sorted(migration_dir.glob('*.sql'))
    
    # Execute each migration file in order
    for migration_file in migration_files:
        with open(migration_file, 'r') as f:
            sql = f.read()
            print(f'Running migration: {migration_file.name}')
            cursor.executescript(sql)
            conn.commit()
    
    conn.close()
    print('Migrations completed successfully!')

if __name__ == '__main__':
    run_migrations()

## In order to run the migrations, run the following command:
## cd backend/db
## python3 run_migrations.py