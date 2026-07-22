# Property Asset Manager

Track rental units and properties: rooms, assets (gas main, water main, electrical panel, furnace, internet, custom), photos, maintenance events, and backups.

## Run locally

```bash
cd PropertyInventoryHistory
npm start
```

## Features (v1)

- **Properties** — multiple units with optional address
- **Rooms** — user-named spaces (Basement, Kitchen, etc.)
- **Assets** — catalog types with dedicated detail forms, or **Other** with a custom name
- **Photos** — attach from camera or library
- **Events** — maintenance history with optional recurring schedule and overdue indicators
- **Backup** — export/import JSON (optional embedded photos)

## Stack

Expo ~56, React Native, TypeScript, AsyncStorage, expo-file-system (legacy API for file paths).
