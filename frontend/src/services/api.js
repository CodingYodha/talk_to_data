const API_BASE_URL = 'http://localhost:8000';

/**
 * Submit a natural language query to the backend (non-streaming)
 * @param {string} question - The user's question
 * @param {string} previousSql - Optional previous SQL for context
 * @returns {Promise<Object>} - The query response
 */
export async function submitQuery(question, previousSql = null) {
    try {
        const body = { question };
        if (previousSql) {
            body.previous_sql = previousSql;
        }

        const response = await fetch(`${API_BASE_URL}/api/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Stream query results via SSE (Server-Sent Events)
 * @param {string} question - The user's question
 * @param {string} previousSql - Optional previous SQL for context
 * @param {function} onEvent - Callback for each event: (eventType, data) => void
 * @param {string} llmMode - 'paid' for Claude or 'free' for GPT-OSS
 * @returns {Promise<void>} - Resolves when stream completes
 */
export async function streamQuery(question, previousSql = null, onEvent, llmMode = 'paid') {
    const body = {
        question,
        llm_mode: llmMode
    };
    if (previousSql) {
        body.previous_sql = previousSql;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/query/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            let currentEvent = null;
            let currentData = '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    // New event starting - dispatch previous if exists
                    if (currentEvent && currentData) {
                        try {
                            let parsedData;
                            try {
                                parsedData = JSON.parse(currentData);
                            } catch {
                                parsedData = currentData;
                            }
                            onEvent(currentEvent, parsedData);
                            if (currentEvent === 'done') {
                                return;
                            }
                        } catch (e) {
                            console.error('Event parse error:', e);
                        }
                    }
                    currentEvent = line.slice(7).trim();
                    currentData = '';
                } else if (line.startsWith('data: ')) {
                    // Accumulate data (could be multi-line)
                    currentData += line.slice(6);
                } else if (line === '' && currentEvent && currentData) {
                    // End of event, dispatch it
                    try {
                        let parsedData;
                        try {
                            parsedData = JSON.parse(currentData);
                        } catch {
                            parsedData = currentData;
                        }

                        onEvent(currentEvent, parsedData);

                        if (currentEvent === 'done') {
                            return;
                        }
                    } catch (e) {
                        console.error('Event parse error:', e);
                    }

                    currentEvent = null;
                    currentData = '';
                }
            }
        }
    } catch (error) {
        console.error('Stream Error:', error);
        onEvent('error', error.message);
        throw error;
    }
}

/**
 * Check if the backend is healthy
 * @returns {Promise<Object>} - Health status
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return await response.json();
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

/**
 * Analyze query results for deep insights and chart recommendations
 * @param {Array<Object>} data - Query result data (array of row objects)
 * @param {string} question - Original user question for context
 * @returns {Promise<Object>} - Analysis result with chart config and insights
 */
export async function analyzeData(data, question = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data, question }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Analysis Error:', error);
        throw error;
    }
}
