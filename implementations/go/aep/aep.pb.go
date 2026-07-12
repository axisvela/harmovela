package aep

import (
	"encoding/json"
)

type HarmovelaMessage struct {
	JsonPayload string `protobuf:"bytes,1,opt,name=json_payload,json=jsonPayload,proto3" json:"json_payload,omitempty"`
}

func (m *HarmovelaMessage) Reset()         { *m = HarmovelaMessage{} }
func (m *HarmovelaMessage) String() string { return m.JsonPayload }
func (m *HarmovelaMessage) ProtoMessage()  {}

func (m *HarmovelaMessage) MarshalJSON() ([]byte, error) {
	return json.Marshal(map[string]string{"json_payload": m.JsonPayload})
}

func (m *HarmovelaMessage) UnmarshalJSON(data []byte) error {
	var v map[string]string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	m.JsonPayload = v["json_payload"]
	return nil
}
