#!/usr/bin/env python3
import http.server
import socketserver
import os
from pathlib import Path

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-type')
        super().end_headers()

    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        return super().do_GET()

# Change to the script directory
os.chdir(Path(__file__).parent)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running on http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
