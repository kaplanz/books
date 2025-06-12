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
api.get("/next", async (c) => {
  return c.json(await upstream(Kind.Next))
})
api.get("/live", async (c) => {
  return c.json(await upstream(Kind.Live))
})
api.get("/read", async (c) => {
  return c.json(await upstream(Kind.Read))
})

// Define upstream fetch
enum Kind {
  Next = 1,
  Live = 2,
  Read = 3,
}

async function upstream(kind: Kind): Promise<JSON> {
  let date = kind == Kind.Read ? "last_read_date" : "date_added";
  return fetch("https://api.hardcover.app/v1/graphql", {
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
                status_id: {_eq: ${kind}}
              }
              order_by: [
                { ${date}: desc },
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
              ${date}
            }
          }
        }`
    })
  })
    .then(r => r.json())
    .then(({ data }) => data.me[0].user_books.map((item: any) => ({
      book: item.edition,
      date: new Date(item[date]),
    })))
}

// Serve API
export default {
  port: parseInt(args.port),
  fetch: api.fetch,
}
