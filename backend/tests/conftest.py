import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport

# Import all models to register them on Base.metadata
from app.core.db import Base
from app.models import *  # noqa: F403
from app.main import app
from app.deps import get_db

from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:1234@localhost:5432/ethara_seat_test_db"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a session-wide PostgreSQL engine and create all tables."""
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # Enable trigram extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        # Drop all tables first to ensure clean state
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a function-scoped database session wrapped in an outer transaction that rolls back."""
    connection = await test_engine.connect()
    transaction = await connection.begin()

    async_session = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    async with async_session() as session:
        yield session

    await transaction.rollback()
    await connection.close()


@pytest_asyncio.fixture(scope="function")
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    """Provide an HTTPX AsyncClient with overridden db dependencies."""
    async def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()
