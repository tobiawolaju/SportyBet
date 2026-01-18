# SportyBet Scraper API Documentation

This API provides access to scraped basketball match data from SportyBet.

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Get All Matches
Returns a list of all currently scraped matches.

- **URL**: `/api/matches`
- **Method**: `GET`
- **Behavior**: This endpoint triggers a live scrape of SportyBet and returns the current matches directly. No local data is cached or stored.
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**: `Array<Match>`

**Example Match Object**:
```json
{
  "league": "USA NBA",
  "id": "19435",
  "date": "17/01 Saturday",
  "time": "23:00",
  "teams": {
    "home": "Dallas Mavericks",
    "away": "Utah Jazz"
  },
  "odds": {
    "1": "1.69",
    "2": "2.29",
    "specifier": "240.5",
    "over": "1.93",
    "under": "1.91"
  }
}
```

### 2. Manual Scrape Verification
Triggers a live scrape and returns the data along with a confirmation message.

- **URL**: `/api/scrape`
- **Method**: `GET` or `POST`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**: `{ "message": "Scraping completed successfully", "count": number, "data": Array<Match> }`

---

## Data Schema

### Match Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `league` | `string` | The name of the basketball league. |
| `id` | `string` | Unique identifier for the match. |
| `date` | `string` | The date of the match. |
| `time` | `string` | The scheduled start time. |
| `teams` | `object` | Contains `home` and `away` team names. |
| `odds` | `object` | Contains winner odds (`1`, `2`) and optionally handicap/total odds. |

## Running the Server
To start the API server, run:
```bash
node server.js
```
