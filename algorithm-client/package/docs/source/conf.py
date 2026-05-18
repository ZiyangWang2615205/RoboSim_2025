# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

from algorithm_client.__about__ import __version__

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = "algorithm-client"
copyright = "2024, Ashby Thorpe, Joline Zhou, David Wusu, Asher Bloom, Daniel Zhang"
author = "Ashby Thorpe, Joline Zhou, David Wusu, Asher Bloom, Daniel Zhang"
version = __version__
release = __version__

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "sphinx.ext.napoleon",
    "sphinx.ext.githubpages",
    "myst_parser"
]

templates_path = ["_templates"]
exclude_patterns = []


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "furo"
html_static_path = ["_static"]

# Autodoc options
autodoc_member_order = "bysource"
