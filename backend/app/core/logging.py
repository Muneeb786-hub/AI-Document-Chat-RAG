import logging
import sys
from typing import Any, Dict


def setup_logging(debug: bool = False) -> logging.Logger:
    """Configure structured console logging for the application."""
    log_level = logging.DEBUG if debug else logging.INFO

    # Define custom formatter format
    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
    )

    formatter = logging.Formatter(fmt=log_format, datefmt="%Y-%m-%d %H:%M:%S")

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    # Root Logger
    root_logger = logging.getLogger("rag_app")
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    root_logger.addHandler(console_handler)
    root_logger.propagate = False

    return root_logger


logger = setup_logging()
