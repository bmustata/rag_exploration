## Enhanced Document Search & RAG Explorer

Search through your knowledge base using Elasticsearch or RAG (Retrieval-Augmented Generation) with LLM responses. Knowledge source: micropython

Elasticsearch Search

RAG Vector Search

RAG LLM Response

## RAG Vector Similarity Search

Search using vector embeddings to find semantically similar content.

Search Query

eps32

## RAG Search

RAG Vector Search - Found 10 documents:

1. The ESP32 port also supports the machine.ADC API:

Score: 0.3755 Type: micropython Filename: micropython-docs8-13.md Content:

ADC. atten ( atten ) Equivalent to ADC.init(atten=atten) . ADC. width ( bits ) Equivalent to ADC.block().init(bits=bits) .

The only chip that can switch resolution to a lower one is the normal esp32. The C2 &amp; S3 are stuck at 12 bits, while the S2 is at 13 bits.

For compatibility, the ADC object also provides constants matching the supported ADC resolutions, per chip:

## ESP32:

- ADC.WIDTH_9BIT = 9 • ADC.WIDTH_10BIT = 10 • ADC.WIDTH_11BIT = 11 • ADC.WIDTH_12BIT = 12 ESP32 C3 &amp; S3: • ADC.WIDTH_12BIT = 12 ESP32 S2: • ADC.WIDTH_13BIT = 13 ADC. deinit ()

Provided to deinit the adc driver.

## 8.13 Pulse Counter (pin pulse/edge counting)

The ESP32 provides up to 8 pulse counter peripherals depending on the hardware, with id 0..7. These can be configured to count rising and/or falling edges on any input pin.

Use the esp32.PCNT class:

Top K Results

10

Update RAG Knowledge Base
