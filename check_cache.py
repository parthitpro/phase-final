import json
from graphify.cache import check_semantic_cache
from pathlib import Path

def main():
    detect_path = Path('graphify-out/.graphify_incremental.json')
    if not detect_path.exists():
        print("Error: incremental detection file not found")
        return
        
    detect = json.loads(detect_path.read_text())
    all_files = [f for files in detect['files'].values() for f in files]

    cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(all_files)

    if cached_nodes or cached_edges or cached_hyperedges:
        Path('graphify-out/.graphify_cached.json').write_text(json.dumps({
            'nodes': cached_nodes, 
            'edges': cached_edges, 
            'hyperedges': cached_hyperedges
        }))
    Path('graphify-out/.graphify_uncached.txt').write_text('\n'.join(uncached))
    print(f'Cache: {len(all_files)-len(uncached)} files hit, {len(uncached)} files need extraction')

if __name__ == '__main__':
    main()
