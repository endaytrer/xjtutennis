package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"sync"

	"github.com/endaytrer/xjtutennis/constant"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"

	_ "github.com/mattn/go-sqlite3"
)

type Encrypted []byte
type Decrypted []byte

type User struct {
	User          string
	Passwd        string
	NetId         string
	Salt          []byte
	NetIdPasswd   Encrypted
	PaymentPasswd Encrypted
}

func encryptData(data Decrypted, key []byte) (Encrypted, error) {
	// encrypt using AES-GCM
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())

	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, data, nil), nil
}

func decryptData(data Encrypted, key []byte) (Decrypted, error) {

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]

	return gcm.Open(nil, nonce, ciphertext, nil)
}
func RegisterUser(conn *sql.Conn, user, passwd, netid, netid_password string, payment_passwd *string) (User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwd), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	var nonnull_payment_passwd string
	if payment_passwd != nil {
		nonnull_payment_passwd = *payment_passwd
	} else {
		nonnull_payment_passwd = constant.DEFAULT_PAYMENT_PASSWD
	}

	salt := make([]byte, 32)
	if _, err := rand.Read(salt); err != nil {
		return User{}, err
	}
	key := pbkdf2.Key([]byte(passwd), salt, 100000, 32, sha256.New)
	encrypted_netid_passwd, err := encryptData([]byte(netid_password), key)
	if err != nil {
		return User{}, err
	}
	encrypted_payment_passwd, err := encryptData([]byte(nonnull_payment_passwd), key)
	if err != nil {
		return User{}, err
	}
	_, err = conn.ExecContext(context.Background(), "INSERT INTO `users` (`user`, `passwd`, `netid`, `salt`, `netid_passwd`, `payment_passwd`) VALUES (?, ?, ?, ?, ?, ?)", user, hashedPassword, netid, salt, encrypted_netid_passwd, encrypted_payment_passwd)
	if err != nil {
		return User{}, err
	}
	return User{
		User:          user,
		Passwd:        string(hashedPassword),
		NetId:         netid,
		Salt:          salt,
		NetIdPasswd:   encrypted_netid_passwd,
		PaymentPasswd: encrypted_payment_passwd,
	}, nil
}

func (t *User) DecryptUserData(passwd string) (*Authorization, error) {
	key := pbkdf2.Key([]byte(passwd), t.Salt, 100000, 32, sha256.New)

	decrypted_netid_passwd, err := decryptData(t.NetIdPasswd, key)
	if err != nil {
		return nil, err
	}
	decrypted_payment_passwd, err := decryptData(t.PaymentPasswd, key)
	if err != nil {
		return nil, err
	}
	return &Authorization{
		NetId:         t.NetId,
		NetIdPasswd:   decrypted_netid_passwd,
		PaymentPasswd: decrypted_payment_passwd,
	}, nil
}

func (t *User) EncryptUserData(passwd string, data Authorization) error {

	salt := make([]byte, 32)
	if _, err := rand.Read(salt); err != nil {
		return err
	}

	key := pbkdf2.Key([]byte(passwd), salt, 100000, 32, sha256.New)

	encrypted_netid_passwd, err := encryptData(data.NetIdPasswd, key)
	if err != nil {
		return err
	}
	encrypted_payment_passwd, err := encryptData(data.PaymentPasswd, key)
	if err != nil {
		return err
	}
	t.NetId = data.NetId
	t.Salt = salt
	t.NetIdPasswd = encrypted_netid_passwd
	t.PaymentPasswd = encrypted_payment_passwd

	return nil
}

type Authorization struct {
	NetId         string
	NetIdPasswd   Decrypted
	PaymentPasswd Decrypted
}

// Use sync map instead of mutex to increase throughput
//
//	type AuthorizationCache struct {
//		sync.Mutex
//		auths map[int64]Authorization
//	}
type AuthorizationCache sync.Map

func NewAuthorizationCache() *AuthorizationCache {
	auth_cache := AuthorizationCache(sync.Map{})
	return &auth_cache
}

func (t *AuthorizationCache) RetrieveAuthorization(reservation_uid int64) *Authorization {
	auth, ok := (*sync.Map)(t).LoadAndDelete(reservation_uid)

	if !ok {
		return nil
	}
	auth_typed, _ := auth.(Authorization)
	return &auth_typed
}

func (t *AuthorizationCache) PlaceAuthorization(reservation_uid int64, authorization Authorization) {
	(*sync.Map)(t).Store(reservation_uid, authorization)
}
