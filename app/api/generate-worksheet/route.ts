import { generateText, Output } from 'ai'
import { z } from 'zod'

const worksheetSchema = z.object({
  title: z.string().describe('A clear, engaging title for the worksheet'),
  educationalContent: z.string().describe('2-3 paragraphs of psychoeducational content explaining the topic'),
  reflectionQuestions: z.array(z.string()).describe('Thought-provoking reflection questions'),
  exercises: z.array(z.object({
    title: z.string(),
    instructions: z.string(),
  })).describe('Practical exercises with clear instructions'),
  journalPrompts: z.array(z.string()).describe('Journal prompts for deeper self-exploration'),
})

export async function POST(req: Request) {
  try {
    const { topic, goal, clientIssue } = await req.json()

    if (!topic || !goal) {
      return Response.json(
        { error: 'Topic and goal are required' },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'anthropic/claude-sonnet-4.6',
      output: Output.object({
        schema: worksheetSchema,
      }),
      prompt: `You are an expert mental health therapist creating evidence-based therapeutic worksheets. 
Your worksheets should be:
- Clinically sound and based on established therapeutic approaches (CBT, DBT, ACT, mindfulness)
- Accessible and written in clear, compassionate language
- Practical with actionable exercises
- Appropriate for adult clients working on personal growth

Format the educational content with proper paragraphs. Make exercises specific and achievable.

Create a therapeutic worksheet with the following parameters:

Topic: ${topic}
Therapeutic Goal: ${goal}
${clientIssue ? `Client Issue/Context: ${clientIssue}` : ''}

Generate a complete worksheet including:
1. An engaging title
2. Educational content explaining the topic and its relevance (2-3 paragraphs)
3. 3-5 reflection questions
4. 2-4 practical exercises with clear instructions
5. 3-5 journal prompts for deeper exploration`,
    })

    return Response.json({ worksheet: result.output })
  } catch (error) {
    console.error('Error generating worksheet:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate worksheet' },
      { status: 500 }
    )
  }
}
