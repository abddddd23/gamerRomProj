# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None

# Collect all the necessary files and modules
a = Analysis(
    ['app/main_exe.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('frontend_dist', 'frontend_dist'),
        ('../VERSION', 'VERSION'),
        ('alembic', 'alembic'),  # Include alembic migrations
        ('alembic.ini', '.'),
    ],
    hiddenimports=[
        'app.db.session',
        'app.db.base',
        'app.models.entities',
        'app.models.enums',
        'app.core.config',
        'app.auth.security',
        'uvicorn',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sqlalchemy',
        'sqlalchemy.dialects',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.postgresql',
        'psycopg',
        'psycopg.pq',
        'pydantic',
        'pydantic_settings',
        'python_jose',
        'passlib',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'bcrypt',
        'alembic',
        'alembic.config',
        'alembic.script',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'pandas',
        'numpy',
        'scipy',
        'PIL',
        'pytest',
        'test',
        'tests',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='GamingRoomBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # You can add an icon file here later
)
