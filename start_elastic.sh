# Start Elasticsearch

# port 9200 is for the Elasticsearch API / web interface
# port 9300 is for the Elasticsearch transport layer
# Web UI: http://localhost:9200

# Remove existing container if it exists
podman rm -f es01 2>/dev/null || true

podman run -d --name es01 --pod espod \
  -e discovery.type=single-node \
  -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
  -e xpack.security.enabled=false \
  -v $(pwd)/elastic_data:/usr/share/elasticsearch/data \
  docker.elastic.co/elasticsearch/elasticsearch:9.1.0

echo "Elasticsearch started successfully!"
echo "Web UI: http://localhost:9200"