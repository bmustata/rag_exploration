## Enhanced Document Search & RAG Explorer

Search through your knowledge base using Elasticsearch or RAG (Retrieval-Augmented Generation) with LLM responses. Knowledge source: micropython

Elasticsearch Search

RAG Vector Search

RAG LLM Response

Traditional Elasticsearch Search

Search Query

eps32

Search Type

normal

• fuzzy

Search

Update Knowledge Base

Found 37 documents:

1. ## 8.2 MicroPython tutorial for ESP32

Type: micropython Score: 8.41 ID: b7e838da-9831-406e-b6ad-a6b2a7725229 Content:

## 8.2 MicroPython tutorial for ESP32

This tutorial is intended to get you started using MicroPython on the ESP32 system-on-a-chip. If it is your first time it is recommended to follow the tutorial through in the order below. Otherwise the sections are mostly self contained, so feel free to skip to those that interest you.

The tutorial does not assume that you know Python, but it also does not attempt to explain any of the details of the Python language. Instead it provides you with commands that are ready to run, and hopes that you will gain a bit of Python knowledge along the way. To learn more about Python itself please refer to https://www.python.org.

## 8.2.1 Getting started with MicroPython on the ESP32

Using MicroPython is a great way to get the most of your ESP32 board. And vice versa, the ESP32 chip is a great platform for using MicroPython. This tutorial will guide you through setting up MicroPython, getting a prompt, using WebREPL, connecting to the network and communicating with the Internet, using the hardware peripherals, and controlling some external components.

Let's get started!

## Requirements

The first thing you need is a board with an ESP32 chip. The MicroPython software supports the ESP32 chip itself and any board should work. The main characteristic of a board is how the GPIO pins are connected to the outside world, and whether it includes a built-in USB-serial converter to make the UART available to your PC.

Names of pins will be given in this tutorial using the chip names (eg GPI02) and it should be straightforward to find which pin this corresponds to on your particular board.
