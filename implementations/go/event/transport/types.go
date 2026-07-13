package transport

type MessageHandler func(msg *Message) *Message
type ReceiveHandler func(msg *Message)

type Message struct {
	JsonPayload string
}

type EventHandler func(event map[string]any)
type ErrorHandler func(err error)
