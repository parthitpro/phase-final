# Graph Report - project  (2026-05-03)

## Corpus Check
- 27 files · ~42,402 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 224 edges · 16 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `add_order_log()` - 10 edges
2. `OrderItemBase` - 5 edges
3. `confirmDelete()` - 5 edges
4. `log()` - 4 edges
5. `create_order()` - 4 edges
6. `update_order()` - 4 edges
7. `process_order_items()` - 4 edges
8. `ProductBase` - 4 edges
9. `deleteCustomer()` - 4 edges
10. `confirmCancelOrder()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (30 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (30): addProduct(), approvePayment(), bulkDispatchMfg(), calculatePacking(), cancelOrder(), confirmCancelOrder(), confirmDelete(), deduplicateCustomers() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (22): add_order_log(), approve_payment(), bulk_dispatch_delivery(), bulk_dispatch_manufacturing(), bulk_ready_delivery(), cancel_order(), create_order(), create_product() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (13): Config, Customer, CustomerUpdate, Order, OrderCreate, OrderItem, OrderItemBase, OrderItemCreate (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (9): get_db(), init_db(), set_sqlite_pragma(), Customer, Order, OrderItem, OrderLog, Product (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.8
Nodes (3): agent_task(), log(), run_stress_test()

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._