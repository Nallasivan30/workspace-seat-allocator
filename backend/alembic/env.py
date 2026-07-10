import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import settings and metadata
from app.core.config import settings
from app.models import Base

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Extract and sanitize query parameters for asyncpg compatibility
parsed = urlparse(db_url)
query_params = parse_qs(parsed.query)

has_ssl = False
if "sslmode" in query_params:
    has_ssl = True
    query_params.pop("sslmode")
if "channel_binding" in query_params:
    query_params.pop("channel_binding")
if "ssl" in query_params:
    has_ssl = True

# Reconstruct URL without unsupported params
new_query = urlencode(query_params, doseq=True)
db_url = urlunparse(parsed._replace(query=new_query))
config.set_main_option("sqlalchemy.url", db_url)

# Save connect_args to be used in online migration
migration_connect_args = {}
if has_ssl:
    migration_connect_args["ssl"] = True

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=migration_connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
