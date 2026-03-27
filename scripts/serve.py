#!/usr/bin/env python3
"""Live reload dev server. Run: python3 serve.py"""
from livereload import Server
server = Server()
server.watch('*.html')
server.watch('*.css')
server.watch('*.js')
server.watch('*.svg')
server.serve(port=8000, root='.')
