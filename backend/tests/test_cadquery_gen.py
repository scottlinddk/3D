"""Tests for CadQuery model generation error handling."""

from builtins import __import__ as real_import

import pytest

from app.processing.cadquery_gen import generate_model


def test_generate_model_surfaces_native_import_error(monkeypatch, tmp_path):
    """Import failures should report the underlying native-library problem."""

    def mocked_import(name, *args, **kwargs):
        if name == "cadquery":
            raise ImportError("libXrender.so.1: cannot open shared object file")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", mocked_import)

    with pytest.raises(RuntimeError, match=r"libXrender\.so\.1"):
        generate_model(
            points=[[0, 0], [10, 0], [10, 10]],
            height=5.0,
            output_path=str(tmp_path / "model.stl"),
        )
