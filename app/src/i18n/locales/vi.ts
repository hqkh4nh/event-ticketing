export const vi = {
  home: {
    title: 'Đặt vé sự kiện',
    subtitle: 'Nền tảng ứng dụng đã sẵn sàng.',
  },
  auth: {
    brand: 'eTicket',
    login: {
      title: 'Đăng nhập',
      subtitle: 'Chào mừng bạn trở lại',
      submit: 'Đăng nhập',
      noAccount: 'Chưa có tài khoản?',
      goRegister: 'Đăng ký',
      forgot: 'Quên mật khẩu?',
    },
    register: {
      title: 'Tạo tài khoản',
      subtitle: 'Chỉ mất một phút',
      submit: 'Tạo tài khoản',
      hasAccount: 'Đã có tài khoản?',
      goLogin: 'Đăng nhập',
      roleLabel: 'Bạn là',
      roleAttendee: 'Người tham dự',
      roleOrganizer: 'Nhà tổ chức',
      organizerNotice:
        'Tài khoản nhà tổ chức cần quản trị viên duyệt trước khi tạo sự kiện.',
    },
    field: {
      email: 'Email',
      emailPlaceholder: 'ban@example.com',
      password: 'Mật khẩu',
      passwordPlaceholder: 'Ít nhất 8 ký tự',
      fullName: 'Họ và tên',
      fullNamePlaceholder: 'Nguyễn Thị Mai Anh',
    },
    error: {
      emailRequired: 'Vui lòng nhập email',
      emailInvalid: 'Email không hợp lệ',
      passwordRequired: 'Vui lòng nhập mật khẩu',
      passwordShort: 'Mật khẩu phải có ít nhất 8 ký tự',
      fullNameRequired: 'Vui lòng nhập họ tên',
    },
    social: {
      divider: 'Hoặc',
      google: 'Tiếp tục với Google',
      comingSoon: 'Sắp có',
    },
  },


  api: {
    error: {
      UNKNOWN: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      NETWORK: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
      VALIDATION_FAILED: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
      EMAIL_ALREADY_REGISTERED: 'Email này đã được đăng ký.',
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
      SESSION_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
      UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      ACCOUNT_BLOCKED: 'Tài khoản đã bị khoá.',
      ACCOUNT_PENDING_APPROVAL: 'Tài khoản đang chờ quản trị viên duyệt.',
      FORBIDDEN_ROLE: 'Bạn không có quyền thực hiện thao tác này.',
      FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
      NOT_EVENT_STAFF: 'Bạn không được gán cho sự kiện này.',
      EVENT_ID_REQUIRED: 'Thiếu thông tin sự kiện.',
      NOT_FOUND: 'Không tìm thấy nội dung.',
      CONFLICT: 'Thao tác bị trùng lặp.',
      INTERNAL_ERROR: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
    },
    

    validation: {
      isEmail: 'Email không hợp lệ.',
      isNotEmpty: 'Vui lòng nhập thông tin này.',
      isString: 'Giá trị không hợp lệ.',
      isIn: 'Giá trị không hợp lệ.',
      minLength: 'Giá trị quá ngắn.',
      maxLength: 'Giá trị quá dài.',
      unknown: 'Giá trị không hợp lệ.',
    },
  },
};