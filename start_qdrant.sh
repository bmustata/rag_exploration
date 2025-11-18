# Start Qdrant

# port 6333 is for the Qdrant API and web interface
# port 6334 is for the Qdrant gRPC API
# Web UI: http://localhost:6333/dashboard

# Remove existing container if it exists
podman rm -f qdrant 2>/dev/null || true

podman run -d --name qdrant -p 6333:6333 -p 6334:6334 \
    -v "$(pwd)/qdrant_data:/qdrant/storage:z" \
    qdrant/qdrant

echo "Qdrant started successfully!"
echo "API: http://localhost:6333"
echo "Web UI: http://localhost:6333/dashboard"