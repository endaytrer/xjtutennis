package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	webassets "github.com/endaytrer/xjtutennis/client"
	"github.com/endaytrer/xjtutennis/constant"
	"github.com/gin-contrib/static"
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
	switch c.Request.Method {
	case "GET", "DELETE":
		params = make(map[string]interface{})
		for k, v := range c.Request.URL.Query() {
			if len(v) == 1 {
				params[k] = v[0]
			} else {
				params[k] = v
			}
		}
	case "POST", "PUT":
		req_body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			err = constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
			err_response := Response{
				Success: false,
				Message: err.Error(),
				Data:    nil,
			}
			c.JSON(err.(constant.TennisApiError).ToHttpStatus(), err_response)
			return
		}

		err = json.Unmarshal(req_body, &params)
		if err != nil {
			err = constant.TennisApiError{ErrorType: constant.MalformedData, Message: "json parse failed"}
			err_response := Response{
				Success: false,
				Message: err.Error(),
				Data:    nil,
			}
			c.JSON(err.(constant.TennisApiError).ToHttpStatus(), err_response)
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
		case constant.TennisApiError:
			err_response.Code = int(v.ErrorType)
			c.JSON(v.ToHttpStatus(), err_response)
		default:
			err_response.Code = int(constant.InternalServerError)
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
		return nil, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
	}
	err = decoder.Decode(params)
	if err != nil {
		return nil, constant.TennisApiError{ErrorType: constant.MalformedData, Message: "Invalid / missing parameters"}
	}
	return &param, nil
}
func restVersion(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, _ map[string]interface{}) (interface{}, error) {
		return s.Version()
	})
}
func restCheckRootAdminToken(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[RootAdminTokenParams](params)
		if err != nil {
			return nil, err
		}
		return s.CheckRootAdminToken(param), nil
	})
}
func restCreateInvitation(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[RootAdminTokenParams](params)
		if err != nil {
			return nil, err
		}
		return s.CreateInvitation(param)
	})
}
func restCheckInvitation(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[CheckInvitationParams](params)
		if err != nil {
			return nil, err
		}
		return s.CheckInvitation(param)
	})
}
func restSignUp(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[SignUpParams](params)
		if err != nil {
			return nil, err
		}
		return s.SignUp(param)
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
func restChangeIdentity(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[ChangeIdentityParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.ChangeIdentity(param)
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

func restAuthorize(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[AuthorizeParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.Authorize(param)
	})
}
func restDeleteReservation(s *SessionManager, c *gin.Context) {
	makeResponse(s, c, func(s *SessionManager, params map[string]interface{}) (interface{}, error) {
		param, err := decodeParams[CancelReservationParams](params)
		if err != nil {
			return nil, err
		}
		return nil, s.DeleteReservation(param)
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

func ServeHTTP(s *SessionManager, listen_addr string) {
	fs := webassets.FS()
	r := gin.Default()

	r.Use(static.Serve("/", fs))
	api := r.Group("/api")
	{
		api.GET("/version", func(c *gin.Context) { restVersion(s, c) })

		api.GET("/admin/token", func(c *gin.Context) { restCheckRootAdminToken(s, c) })
		api.POST("/admin/invitation", func(c *gin.Context) { restCreateInvitation(s, c) })

		api.GET("/invitation", func(c *gin.Context) { restCheckInvitation(s, c) })
		api.POST("/signup", func(c *gin.Context) { restSignUp(s, c) })
		api.GET("/login", func(c *gin.Context) { restGetLoginAccount(s, c) })
		api.POST("/login", func(c *gin.Context) { restLogin(s, c) })
		api.DELETE("/login", func(c *gin.Context) { restSignOut(s, c) })
		api.PUT("/passwd", func(c *gin.Context) { restChangePasswd(s, c) })
		api.PUT("/netid_passwd", func(c *gin.Context) { restChangeIdentity(s, c) })

		api.POST("/reservations", func(c *gin.Context) { restPlaceReservation(s, c) })
		api.POST("/authorization", func(c *gin.Context) { restAuthorize(s, c) })
		api.GET("/reservations", func(c *gin.Context) { restGetReservations(s, c) })
		api.DELETE("/reservations", func(c *gin.Context) { restDeleteReservation(s, c) })

	}

	r.NoRoute(func(c *gin.Context) {
		fmt.Printf("%s doesn't exists, redirect on /\n", c.Request.URL.Path)
		c.FileFromFS("/__spa-fallback.html", fs)
	})
	r.Run(listen_addr)
}
