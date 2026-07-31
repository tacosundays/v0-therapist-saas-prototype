import { handleGenerateWorksheetRequest } from "./handler"

export async function POST(req: Request) {
  return handleGenerateWorksheetRequest(req)
}
