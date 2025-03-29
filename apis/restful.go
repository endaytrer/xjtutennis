package apis

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

type Response struct {
	Success bool
	Message string
	Code    int
	Data    interface{}
}

func makeResponse(s *SessionManager, c *gin.Context, callback func(s *SessionManager, params map[string]interface{}) (interface{}, error)) {
	var params map[string]interface{}
	if c.Request.Method == "GET" || c.Request.Method == "DELETE" {
		params = make(map[string]interface{})
		for k, v := range c.Request.URL.Query() {
			if len(v) == 1 {
				params[k] = v[0]
			} else {
				params[k] = v
			}
		}
	} else if c.Request.Method == "POST" || c.Request.Method == "PUT" {
		req_body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			err = TennisApiError{errorType: InternalServerError, message: err.Error()}
			err_response := Response{
				Success: false,
				Message: err.Error(),
				Data:    nil,
			}
			c.JSON(err.(TennisApiError).ToHttpStatus(), err_response)
			return
		}

		err = json.Unmarshal(req_body, &params)
		if err != nil {
			err = TennisApiError{errorType: MalformedData, message: "json parse failed"}
			err_response := Response{
				Success: false,
				Message: err.Error(),
				Data:    nil,
			}
			c.JSON(err.(TennisApiError).ToHttpStatus(), err_response)
			return
		}
	}
	session, err := c.Cookie("session_id")

	// inject session
	if err == nil {
		params["Session"] = session
	} else {
		params["Session"] = "" // in this way no session will return "not logged in" instead of "malformed data"
	}
	data, err := callback(s, params)
	if err != nil {
		err_response := Response{
			Success: false,
			Message: err.Error(),
			Data:    nil,
		}
		switch v := err.(type) {
		case TennisApiError:
			err_response.Code = int(v.errorType)
			c.JSON(v.ToHttpStatus(), err_response)
		default:
			err_response.Code = int(InternalServerError)
			c.JSON(http.StatusInternalServerError, err_response)
		}
		return
	}
	switch v := data.(type) {
	case SessionId:
		c.SetCookie("session_id", string(v), int(account_login_expiry), "/", "", false, true)
		response := Response{
			Success: true,
			Code:    0,
			Message: "",
			Data:    nil,
		}
		c.JSON(http.StatusOK, response)
	default:
		response := Response{
			Success: true,
			Code:    0,
			Message: "",
			Data:    data,
		}
		c.JSON(http.StatusOK, response)
	}
}
func decodeParams[T interface{}](params map[string]interface{}) (*T, error) {
	var param T
	decoder, err := mapstructure.NewDecoder(&mapstructure.DecoderConfig{
		Result:           &param,
		ErrorUnset:       true,
		WeaklyTypedInput: true,
	})
	if err != nil {
		return nil, TennisApiError{errorType: InternalServerError, message: err.Error()}
	}
	err = decoder.Decode(params)
	if err != nil {
		return nil, TennisApiError{errorType: MalformedData, message: "Invalid / missing parameters"}
	}
	return &param, nil
}
func restVersion(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, _ map[string]interface{}) (interface{}, error) {
		return s.Version()
	})
}
func restLogin(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[LoginParams](params)
		if err != nil {
			return nil, err
		}
		return s.Login(param)
	})
}
func restGetLoginAccount(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[SessionOnlyParams](params)
		if err != nil {
			return nil, err
		}
		return s.GetLoginAccount(param)
	})
}
func restSignOut(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[SessionOnlyParams](params)
		if err != nil {
			return nil, err
		}
		s.SignOut(param)
		return nil, nil
	})
}
func restChangePasswd(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[ChangePasswdParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.ChangePasswd(param)
	})
}
func restChangeNetIdPasswd(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[ChangeNetIdPasswdParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.ChangeNetIdPasswd(param)
	})
}

func restPlaceReservation(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[PlaceReservationParams](params)
		if err != nil {
			return nil, err
		}
		return s.PlaceReservation(param)
	})
}
func restCancelReservation(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[CancelReservationParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.CancelReservation(param)
	})
}
func restGetReservations(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[GetReservationsParams](params)
		if err != nil {
			return nil, err
		}
		return s.GetReservations(param)
	})
}

func ServeHTTP(s *SessionManager, port int) {
	r := gin.Default()

	r.GET("/api/version", func(c *gin.Context) { restVersion(s, c) })
	r.GET("/api/login", func(c *gin.Context) { restGetLoginAccount(s, c) })
	r.POST("/api/login", func(c *gin.Context) { restLogin(s, c) })
	r.DELETE("/api/login", func(c *gin.Context) { restSignOut(s, c) })
	r.PUT("/api/passwd", func(c *gin.Context) { restChangePasswd(s, c) })
	r.PUT("/api/netid_passwd", func(c *gin.Context) { restChangeNetIdPasswd(s, c) })

	r.POST("/api/reservations", func(c *gin.Context) { restPlaceReservation(s, c) })
	r.GET("/api/reservations", func(c *gin.Context) { restGetReservations(s, c) })
	r.DELETE("/api/reservations", func(c *gin.Context) { restCancelReservation(s, c) })
	r.Run(fmt.Sprintf("0.0.0.0:%d", port))
}
