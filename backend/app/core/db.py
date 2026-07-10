from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

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

connect_args = {}
if has_ssl:
    connect_args["ssl"] = True

engine = create_async_engine(
    db_url,
    pool_pre_ping=True,
    echo=False,  # Set to True if we need query logs
    connect_args=connect_args,
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
