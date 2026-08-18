Use `Dialog` for create/edit flows (create wiki, convert to project, proposal mail preview).

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogHeader><DialogTitle>Create wiki</DialogTitle><DialogDescription>Wikis attach to work items.</DialogDescription></DialogHeader>
  <Input placeholder="Wiki title" />
  <DialogFooter><Button variant="outline">Cancel</Button><Button>Create</Button></DialogFooter>
</Dialog>
```

Notes
- This DS build positions itself `absolute` inside the nearest positioned ancestor so it can be previewed in a card; the product uses a portal + `position: fixed`.
- Titles are 18px semibold, never 24px — that size belongs to `CardTitle`.
