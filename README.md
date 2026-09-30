# Smart Routing Simulator

A browser-based simulator for the Computer Networks course. It models a network of 8 routers, computes shortest paths with **Dijkstra (link-state)** and **Bellman-Ford (distance-vector)**, and adds a **congestion-aware "smart" metric** so traffic is steered away from busy links.

Built with plain HTML, CSS and JavaScript. No installs, no frameworks.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page layout: controls, network canvas, result panels |
| `style.css` | Styling (light and dark mode) |
| `script.js` | All logic: topology, metrics, algorithms, drawing, events |

## How to run in VS Code

**Option 1: Live Server (recommended)**
1. Open VS Code, then File > Open Folder and choose `smart-routing-simulator`.
2. Install the extension "Live Server" (Ritwick Dey) from the Extensions tab.
3. Right-click `index.html` and choose "Open with Live Server".

**Option 2: No extension**
Double-click `index.html` to open it in any browser.

**Option 3: Python server**
In the VS Code terminal, run `python -m http.server 8000`, then open `http://localhost:8000`.

The page loads two Google Fonts. Without internet it still works and falls back to system fonts.

## How to use

1. Choose **From** and **To** routers. The chosen path is highlighted in teal.
2. Choose the **Algorithm**: Dijkstra or Bellman-Ford. Both give the same paths. The step log on the right differs.
3. Choose the **Metric**: hop count, delay, or smart (delay + congestion).
4. Set a **Flow size** in Mbps and click **Send flow**. An animated packet follows the path and every link on it gains that load.
5. Watch link colors: grey is light, amber is above 40% utilization, red is above 75%.
6. Send more flows with the smart metric. Later flows move to other paths as the first path fills.
7. **Click a link** to fail it (dashed red). Routes are recomputed immediately. Click again to restore it.
8. **Drag routers** to rearrange the layout. This is cosmetic and does not change costs.
9. **Clear traffic** resets all loads. **Restore links** brings failed links back.

### Suggested demo for your viva
1. From A to H, metric = hop count. Note the path.
2. Switch to delay, then smart. Compare the three in the "Same pair, each metric" table.
3. With smart selected, send three 20 Mbps flows. Watch the path change as links load up.
4. Fail a link on the current path and show that the route reconverges.
5. Switch between Dijkstra and Bellman-Ford and show the different step logs with identical results.

## Theory

### Routing and the network layer
Routing is the network-layer job of choosing a path for packets from source to destination. Each router keeps a **routing table** mapping every destination to a **next hop** and a cost. **Forwarding** (moving a packet to the next hop) uses this table. **Routing** (building the table) is what this project simulates.

### Graph model
The network is a weighted undirected graph G = (V, E). Routers are vertices, links are edges. Each link has:
- **delay** (ms): propagation and processing time
- **bandwidth** (Mbps): capacity
- **load** (Mbps): traffic currently on it, so utilization u = load / bandwidth

The routing problem becomes finding the least-cost path in this graph.

### Link-state routing and Dijkstra
In link-state protocols (such as **OSPF**), every router floods information about its links so all routers hold the same full map. Each router then runs **Dijkstra's algorithm** locally:
1. Set the distance to the source to 0 and all others to infinity.
2. Repeatedly pick the unvisited node with the smallest distance.
3. Mark it visited and **relax** its edges: if dist[u] + cost(u,v) < dist[v], update dist[v] and record u as the predecessor of v.
4. Rebuild the path by following predecessors back from the destination.

Dijkstra requires non-negative costs. This implementation scans for the minimum, giving O(V²). With a priority queue it is O((V + E) log V).

### Distance-vector routing and Bellman-Ford
In distance-vector protocols (such as **RIP**), each router only knows its neighbors and shares its distance table with them. The update rule is the **Bellman-Ford equation**:

d(x, y) = min over neighbors v of [ c(x, v) + d(v, y) ]

Repeating this until nothing changes gives shortest paths. The simulator runs it in rounds and logs which nodes changed until it **converges**. Complexity is O(V·E). It also handles negative edge weights, which Dijkstra cannot.

Note: this simulator computes Bellman-Ford centrally to show the rounds. It does not simulate message exchange between routers.

### Metrics
- **Hop count:** every link costs 1 (RIP's metric). Simple, but ignores speed and congestion.
- **Delay:** cost equals link delay. Finds the fastest path when the network is idle.
- **Smart metric:** cost = delay × (1 + 4 × u²). At low utilization the cost is close to the delay. As u approaches 1 the cost grows sharply, so heavily loaded links become unattractive. The squared term keeps light load almost free while punishing near-saturated links.

### Congestion-aware (adaptive) routing
Static metrics always send traffic down the same path, which can overload it while other paths sit idle. Adaptive routing feeds current load back into link costs, so the shortest path changes as traffic changes. This spreads load and reduces queueing delay. The trade-off is that changing paths can cause **route oscillation**, where traffic swings back and forth between paths. Real networks damp this with hysteresis or update timers.

### Fault tolerance and reconvergence
When a link fails it is removed from the graph and the algorithm reruns. The time routers take to agree on new routes is the **convergence time**. Link-state protocols generally converge faster than distance-vector ones.

## Limitations
- Loads are simulated by user-sent flows, not real packets. There are no queues, packet loss or timers.
- Flows stay on links until you clear traffic.
- Bellman-Ford is computed centrally and does not model count-to-infinity or split horizon.
- Costs are symmetric in both directions of a link.

## Ideas to extend
- Add a priority-queue Dijkstra and show the complexity difference.
- Simulate RIP with periodic updates, split horizon and count-to-infinity.
- Add packet loss, queue delay and flows that finish after some time.
- Let users add or remove routers and edit link weights.
- Export the routing tables as CSV for the report.

## Likely viva questions
1. What is the difference between routing and forwarding?
2. Compare link-state and distance-vector routing.
3. Why can Dijkstra not handle negative weights?
4. What is the time complexity of each algorithm here?
5. How does your smart metric avoid congestion, and what problem can it cause?
6. What happens after a link failure?
7. Which real protocols use these ideas (OSPF, RIP, EIGRP)?
