# Project

A support-triage workflow builder. The canvas is at `/experiments/workflow-canvas`.

## Copy link

Copy link writes the current canvas into the URL hash: the nodes, the edges between them, and the viewport (how far the canvas is scrolled). The payload is JSON, compressed with lz-string.

Opening that URL restores the canvas. A hash that is invalid, or a link longer than 8,000 characters, is ignored and the editor starts fresh. Copying shows a short toast, including when the link could not be copied or opened.
