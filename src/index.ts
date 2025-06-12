import { parseArgs } from "util"

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { prettyJSON } from "hono/pretty-json"

// Parse args
const { values: args } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "3000" },
  },
})

// Declare API
const api = new Hono()

// Use middleware
api.use(cors())
api.use(logger())
api.use(prettyJSON())

// Define routes
api.get("/", async (c) => {
  return c.json(
    await fetch("https://api.hardcover.app/v1/graphql", {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.HARDCOVER}`
      },
      method: "POST",
      body: JSON.stringify({
        query: `{
          me {
            user_books(
              where: {
                status_id: {_eq: 3}
              }
              order_by: [
                { last_read_date: asc },
              ]
            ) {
              edition {
                id
                title
                contributions {
                  author {
                    name
                  }
                }
                image {
                  url
                }
              }
              last_read_date
            }
          }
        }`
      })
    })
      .then(r => r.json())
      .then(({ data }) => data.me[0].user_books.map((item: any) => ({
        book: item.edition,
        date: new Date(item.last_read_date),
      })))
  )
})

// Serve API
export default {
  port: parseInt(args.port),
  fetch: api.fetch,
}
