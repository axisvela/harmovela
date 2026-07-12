package aep

import "time"

func Now() string {
	return time.Now().UTC().Format(time.RFC3339)
}
