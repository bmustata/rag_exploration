import gradio as gr
import requests
import json
import os
import time

# Server configuration
SERVER_URL = os.environ.get("ELASTIC_SERVER_URL", "http://localhost:4000")

# Default configuration
DEFAULT_TOP_K = 10
DEFAULT_SHOW_MODEL = True

# Available LLM models (display_name: api_value)
LLM_MODELS = {
    "default": "default",
    "llama3.1 (8b)": "llama3.1",
    "llama3.2 (3b)": "llama3.2",
    "gpt-oss (20b)": "gpt-oss:20b",
    "gemma3 (4b)": "gemma3-4",
    "gemma3 (12b)": "gemma3-12",
    "qwen3 (8b)": "qwen3",
    "online gpt-5": "gpt-5",
    "online gpt-5-mini": "gpt-5-mini",
    "online gpt-5-nano": "gpt-5-nano",
    "online gpt-4o-mini": "gpt-4o-mini",
}

def search_documents(query, search_type="fuzzy"):
    """Search documents in the Elasticsearch server"""
    # Empty query will fetch all documents
    query = query.strip()
    
    try:
        # Determine which endpoint to use based on search type
        if search_type == "fuzzy":
            endpoint = f"{SERVER_URL}/search_fuzz"
        else:
            endpoint = f"{SERVER_URL}/search"
        
        print(f"[API CALL] GET {endpoint} | params: {{'q': '{query}'}}")
        
        # Make request to the server
        response = requests.get(endpoint, params={"q": query})
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Total results: {data.get('total', 0)}")
        
        # Format the results
        if data["total"] == 0:
            return "No documents found matching your query."
        
        # Build a formatted output
        output = f"**Found {data['total']} documents:**\n\n"
        
        for i, result in enumerate(data["results"], 1):
            doc = result["document"]
            output += f"### {i}. <span style='color: gray; text-decoration: underline;'>{doc['title']}</span>\n"
            output += f"**Type:** {doc['type']}\n"
            output += f"**Score:** {result['score']:.2f}\n"
            
            # Display all document fields
            output += f"**ID:** {doc.get('id', 'N/A')}\n"
            output += f"**Content:**\n{doc['content']}\n\n"
            
            # Add separator line between documents (except for the last one)
            if i < len(data["results"]):
                output += "---\n"
            
        return output
    
    except requests.exceptions.RequestException as e:
        return f"Error connecting to the server: {str(e)}"
    except Exception as e:
        return f"An error occurred: {str(e)}"

def update_knowledge_base():
    """Update the knowledge base by triggering reindexing"""
    try:
        endpoint = f"{SERVER_URL}/update"
        print(f"[API CALL] POST {endpoint}")
        
        response = requests.post(endpoint)
        response.raise_for_status()
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Result: {data.get('status', 'unknown')}")
        
        if data.get("status") == "success":
            return f"✅ {data.get('message', 'Knowledge base updated successfully!')}"
        else:
            return f"❌ Update failed: {data.get('error', 'Unknown error')}"
    
    except requests.exceptions.RequestException as e:
        return f"❌ Error connecting to the server: {str(e)}"
    except Exception as e:
        return f"❌ An error occurred: {str(e)}"

def rag_search_documents(query, top_k=DEFAULT_TOP_K):
    """Search documents using RAG vector similarity"""
    query = query.strip()
    
    if not query:
        return "Please enter a search query for RAG search."
    
    try:
        endpoint = f"{SERVER_URL}/rag/search"
        params = {"q": query, "topK": top_k}
        print(f"[API CALL] GET {endpoint} | params: {params}")
        
        response = requests.get(endpoint, params=params)
        response.raise_for_status()
        
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Total results: {data.get('total', 0)}")
        
        if data["total"] == 0:
            return "No documents found matching your query in the RAG knowledge base."
        
        output = f"**RAG Vector Search - Found {data['total']} documents:**\n\n"
        
        for i, result in enumerate(data["results"], 1):
            output += f"### {i}. <span style='color: gray; text-decoration: underline;'>{result['title']}</span>\n"
            output += f"**Score:** {result['score']:.4f}\n"
            output += f"**Type:** {result['type']}\n"
            output += f"**Filename:** {result['filename']}\n"
            output += f"**Content:**\n{result['content']}\n\n"
            
            if i < len(data["results"]):
                output += "---\n"
        
        return output
    
    except requests.exceptions.RequestException as e:
        return f"Error connecting to the RAG server: {str(e)}"
    except Exception as e:
        return f"An error occurred during RAG search: {str(e)}"

def rag_generate_response(query, top_k=DEFAULT_TOP_K, llm_model="default", show_model=DEFAULT_SHOW_MODEL):
    """Generate an LLM response using RAG context"""
    query = query.strip()
    
    if not query:
        return "Please enter a question for RAG response generation."
    
    try:
        endpoint = f"{SERVER_URL}/rag/response"
        params = {"q": query, "topK": top_k}
        
        # Add llmModel parameter if not default
        if llm_model != "default":
            # Map display name to API value
            api_model = LLM_MODELS.get(llm_model, llm_model)
            params["llmModel"] = api_model
        
        print(f"[API CALL] GET {endpoint} | params: {params}")
        
        # Track response time
        start_time = time.time()
        response = requests.get(endpoint, params=params)
        response.raise_for_status()
        end_time = time.time()
        
        response_time = end_time - start_time
        
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Model: {data.get('llmModel', 'default')} | Sources: {data.get('sourcesCount', 0)} | Time: {response_time:.2f}s")
        
        output = f"**RAG LLM Response:**\n\n"
        output += f"**Question:** {query}\n\n"
        
        # Conditionally show model information
        if show_model:
            output += f"**Model Used:** {data.get('llmModel', 'default')}\n\n"
            
        output += f"**Answer:** {data['response']}\n\n"
        
        if data.get('sources') and len(data['sources']) > 0:
            output += f"---\n\n"
            output += f"## 📚 **SOURCES** ({data['sourcesCount']} documents)\n\n"
            output += f"---\n\n"
            for i, source in enumerate(data['sources'], 1):
                output += f"### {i}. <span style='color: gray; text-decoration: underline;'>**{source['title']}**</span> (Score: {source['score']:.4f})\n"
                output += f"   - **File:** {source['filename']}\n"
                output += f"   - **Type:** {source['type']}\n\n"
        
        return output
    
    except requests.exceptions.RequestException as e:
        return f"Error connecting to the RAG server: {str(e)}"
    except Exception as e:
        return f"An error occurred during RAG response generation: {str(e)}"

def update_rag_knowledge_base():
    """Update the RAG knowledge base by triggering reindexing"""
    try:
        endpoint = f"{SERVER_URL}/rag/update"
        print(f"[API CALL] POST {endpoint}")
        
        response = requests.post(endpoint)
        response.raise_for_status()
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Result: {data.get('status', 'unknown')}")
        
        if data.get("status") == "success":
            return f"✅ RAG: {data.get('message', 'RAG knowledge base updated successfully!')}"
        else:
            return f"❌ RAG Update failed: {data.get('error', 'Unknown error')}"
    
    except requests.exceptions.RequestException as e:
        return f"❌ Error connecting to the RAG server: {str(e)}"
    except Exception as e:
        return f"❌ An error occurred during RAG update: {str(e)}"

def get_knowledge_directory():
    """Get the current knowledge directory from the server"""
    try:
        endpoint = f"{SERVER_URL}/koDir"
        print(f"[API CALL] GET {endpoint}")
        
        response = requests.get(endpoint)
        response.raise_for_status()
        data = response.json()
        print(f"[API RESPONSE] Status: {response.status_code} | Knowledge Dir: {data.get('knowledgeDir', 'unknown')}")
        
        # Get the directory name directly from the response (server now returns just the name)
        knowledge_dir = data.get("knowledgeDir", "")
        if knowledge_dir:
            return knowledge_dir.lower()
        return "unknown"
    
    except requests.exceptions.RequestException as e:
        print(f"Error getting knowledge directory: {str(e)}")
        return "unknown"
    except Exception as e:
        print(f"An error occurred getting knowledge directory: {str(e)}")
        return "unknown"

def toggle_model_dropdown(show_model):
    """Toggle visibility of the LLM model dropdown"""
    return gr.update(visible=show_model)

# Create the Gradio interface
with gr.Blocks(title="Enhanced Document Search & RAG Explorer") as demo:
    # Get knowledge directory for title
    ko_dir = get_knowledge_directory()
    
    gr.Markdown("# Enhanced Document Search & RAG Explorer")
    gr.Markdown(f"Search through your knowledge base using Elasticsearch or RAG (Retrieval-Augmented Generation) with LLM responses. **Knowledge source:** {ko_dir}")
    
    with gr.Tabs():
        # Elasticsearch Tab
        with gr.TabItem("Elasticsearch Search"):
            gr.Markdown("### Traditional Elasticsearch Search")
            
            with gr.Row():
                with gr.Column(scale=4):
                    es_query_input = gr.Textbox(label="Search Query", placeholder="Enter your search query or leave empty to fetch all documents...")
                with gr.Column(scale=1):
                    search_type = gr.Radio(
                        choices=["normal", "fuzzy"], 
                        value="fuzzy",
                        label="Search Type"
                    )
            
            with gr.Row():
                es_search_button = gr.Button("Search", variant="primary")
                es_update_button = gr.Button("Update Knowledge Base")
            
            es_results_output = gr.Markdown(label="Search Results")
            
            # Connect Elasticsearch components
            es_search_button.click(
                fn=search_documents,
                inputs=[es_query_input, search_type],
                outputs=es_results_output
            )
            
            es_update_button.click(
                fn=update_knowledge_base,
                inputs=[],
                outputs=es_results_output
            )
            
            es_query_input.submit(
                fn=search_documents,
                inputs=[es_query_input, search_type],
                outputs=es_results_output
            )
        
        # RAG Search Tab
        with gr.TabItem("RAG Vector Search"):
            gr.Markdown("### RAG Vector Similarity Search")
            gr.Markdown("Search using vector embeddings to find semantically similar content.")
            
            with gr.Row():
                with gr.Column(scale=4):
                    rag_search_query = gr.Textbox(label="Search Query", placeholder="Enter your search query...")
                with gr.Column(scale=1):
                    rag_search_top_k = gr.Number(value=DEFAULT_TOP_K, label="Top K Results", minimum=1, maximum=20)
            
            with gr.Row():
                rag_search_button = gr.Button("RAG Search", variant="primary")
                rag_update_button = gr.Button("Update RAG Knowledge Base")
            
            rag_search_results = gr.Markdown(label="RAG Search Results")
            
            # Connect RAG Search components
            rag_search_button.click(
                fn=rag_search_documents,
                inputs=[rag_search_query, rag_search_top_k],
                outputs=rag_search_results
            )
            
            rag_update_button.click(
                fn=update_rag_knowledge_base,
                inputs=[],
                outputs=rag_search_results
            )
            
            rag_search_query.submit(
                fn=rag_search_documents,
                inputs=[rag_search_query, rag_search_top_k],
                outputs=rag_search_results
            )
        
        # RAG Response Tab
        with gr.TabItem("RAG LLM Response"):
            gr.Markdown("### RAG with LLM Response Generation")
            gr.Markdown("Ask questions and get AI-generated responses based on your knowledge base.")
            
            with gr.Row():
                with gr.Column(scale=3):
                    rag_response_query = gr.Textbox(label="Your Question", placeholder="Ask a question about your knowledge base...")
                with gr.Column(scale=1):
                    rag_response_top_k = gr.Number(value=DEFAULT_TOP_K, label="Context Sources", minimum=1, maximum=20)
                with gr.Column(scale=1):
                    rag_response_model = gr.Dropdown(
                        choices=list(LLM_MODELS.keys()),
                        value="default",
                        label="LLM Model",
                        visible=DEFAULT_SHOW_MODEL
                    )
            
            with gr.Row():
                rag_show_model = gr.Checkbox(
                    value=DEFAULT_SHOW_MODEL, 
                    label="Show Model Used in Response"
                )
            
            with gr.Row():
                rag_response_button = gr.Button("Generate Response", variant="primary")
                rag_response_update_button = gr.Button("Update RAG Knowledge Base")
            
            rag_response_results = gr.Markdown(label="AI Response")
            
            # Toggle dropdown visibility when checkbox changes
            rag_show_model.change(
                fn=toggle_model_dropdown,
                inputs=[rag_show_model],
                outputs=[rag_response_model]
            )
            
            # Connect RAG Response components
            rag_response_button.click(
                fn=rag_generate_response,
                inputs=[rag_response_query, rag_response_top_k, rag_response_model, rag_show_model],
                outputs=rag_response_results
            )
            
            rag_response_update_button.click(
                fn=update_rag_knowledge_base,
                inputs=[],
                outputs=rag_response_results
            )
            
            rag_response_query.submit(
                fn=rag_generate_response,
                inputs=[rag_response_query, rag_response_top_k, rag_response_model, rag_show_model],
                outputs=rag_response_results
            )

# Launch the app
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0")
