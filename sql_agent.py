import reflex as rx
from state import State, Message

def render_message(message: Message):
    """
    Renders a single message in the chat history.
    """
    return rx.box(
        rx.cond(
            message.role == "user",
            rx.box(
                rx.text(message.content, color="white"),
                bg="blue.500",
                p=3,
                border_radius="lg",
                align_self="flex-end",
                max_w="80%",
            ),
            rx.box(
                rx.vstack(
                    rx.text(message.content, font_weight="bold"),
                    
                    # Reasoning Trace & SQL (Collapsible)
                    rx.accordion.root(
                        rx.accordion.item(
                            header="🧠 Reasoning Trace & SQL",
                            content=rx.vstack(
                                rx.text("Thought Process:", font_weight="bold", font_size="sm"),
                                rx.text(message.thought_trace, font_size="sm", white_space="pre-wrap"),
                                rx.text("Generated SQL:", font_weight="bold", font_size="sm", mt=2),
                                rx.code_block(message.sql_code, language="sql", width="100%"),
                                align_items="start",
                            ),
                        ),
                        width="100%",
                        collapsible=True,
                    ),

                    # Data Table (if results exist)
                    rx.cond(
                        message.results,
                        rx.box(
                            rx.data_table(
                                data=message.results,
                                pagination=True,
                                search=True,
                                sort=True,
                            ),
                            width="100%",
                            overflow="auto",
                            max_h="400px",
                            mt=2,
                        ),
                    ),

                    # Error Box (if error exists)
                    rx.cond(
                        message.error != "",
                        rx.callout.root(
                            rx.callout.icon(),
                            rx.callout.text(message.error),
                            color_scheme="red",
                            role="alert",
                            width="100%",
                            mt=2,
                        ),
                    ),
                    align_items="start",
                    width="100%",
                ),
                bg="gray.100",
                p=4,
                border_radius="lg",
                align_self="flex-start",
                max_w="90%",
                width="100%",
            ),
        ),
        width="100%",
        display="flex",
        flex_direction="column",
        mb=4,
    )

def index():
    return rx.container(
        rx.vstack(
            rx.heading("🗣️ Talk to Data", size="8", mb=4),
            rx.text("Query the Chinook Music Database using natural language.", color="gray"),
            
            # Chat History
            rx.vstack(
                rx.foreach(State.chat_history, render_message),
                rx.cond(
                    State.is_thinking,
                    rx.center(rx.spinner(), width="100%", py=4),
                ),
                width="100%",
                height="70vh",
                overflow_y="auto",
                p=4,
                border="1px solid #e2e8f0",
                border_radius="md",
                bg="white",
            ),
            
            # Input Form
            rx.form(
                rx.hstack(
                    rx.input(
                        placeholder="Ask a question (e.g., 'Who are the top 5 artists by sales?')",
                        id="question",
                        width="100%",
                    ),
                    rx.button("Send", type="submit"),
                    width="100%",
                ),
                on_submit=State.handle_submit,
                width="100%",
                mt=4,
            ),
            width="100%",
            align_items="center",
        ),
        size="3", # Container max-width
        py=8,
    )

app = rx.App()
app.add_page(index, title="Talk to Data SQL Agent")
