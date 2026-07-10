package aep

import (
	"encoding/json"
)

type AepMessage struct {
	JsonPayload string `protobuf:"bytes,1,opt,name=json_payload,json=jsonPayload,proto3" json:"json_payload,omitempty"`
}

func (m *AepMessage) Reset()         { *m = AepMessage{} }
func (m *AepMessage) String() string { return m.JsonPayload }
func (m *AepMessage) ProtoMessage()  {}

func (m *AepMessage) MarshalJSON() ([]byte, error) {
	return json.Marshal(map[string]string{"json_payload": m.JsonPayload})
}

func (m *AepMessage) UnmarshalJSON(data []byte) error {
	var v map[string]string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	m.JsonPayload = v["json_payload"]
	return nil
}
