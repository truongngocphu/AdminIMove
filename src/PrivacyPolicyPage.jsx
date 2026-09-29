import React from 'react';
import { ShieldCheck, MapPin, UserRoundCheck, Database, LockKeyhole, Trash2, ExternalLink } from 'lucide-react';

const UPDATED_AT = '29/09/2026';

function Section({ id, title, children }) {
  return <section id={id} className="privacy-section">
    <h2>{title}</h2>
    {children}
  </section>;
}

function DataCard({ icon: Icon, title, children }) {
  return <article className="privacy-data-card">
    <span className="privacy-data-icon" aria-hidden="true"><Icon size={20}/></span>
    <div><h3>{title}</h3><p>{children}</p></div>
  </article>;
}

export default function PrivacyPolicyPage() {
  React.useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Chính sách quyền riêng tư | TH79 iMove';
    return () => { document.title = previousTitle; };
  }, []);

  return <main className="privacy-page">
    <header className="privacy-hero">
      <div className="privacy-shell privacy-hero-inner">
        <a className="privacy-brand" href="https://imove.daututh79.com" aria-label="TH79 iMove">
          <span className="privacy-brand-mark"><MapPin size={22}/></span>
          <span><strong>TH79 iMove</strong><small>Công ty TNHH Đầu tư T&amp;H 79</small></span>
        </a>
        <span className="privacy-badge"><ShieldCheck size={16}/> Chính sách quyền riêng tư</span>
      </div>
    </header>

    <div className="privacy-shell privacy-layout">
      <aside className="privacy-toc" aria-label="Mục lục chính sách">
        <strong>Nội dung</strong>
        <a href="#pham-vi">1. Phạm vi áp dụng</a>
        <a href="#du-lieu">2. Dữ liệu thu thập</a>
        <a href="#muc-dich">3. Mục đích sử dụng</a>
        <a href="#chia-se">4. Chia sẻ dữ liệu</a>
        <a href="#vi-tri">5. Dữ liệu vị trí</a>
        <a href="#bao-mat">6. Bảo mật và lưu trữ</a>
        <a href="#quyen">7. Quyền của người dùng</a>
        <a href="#xoa">8. Xóa tài khoản và dữ liệu</a>
        <a href="#tre-em">9. Trẻ em</a>
        <a href="#thay-doi">10. Thay đổi chính sách</a>
        <a href="#lien-he">11. Liên hệ</a>
      </aside>

      <article className="privacy-content">
        <div className="privacy-title-block">
          <span className="privacy-eyebrow">TH79 iMOVE</span>
          <h1>Chính sách quyền riêng tư</h1>
          <p>Chính sách này giải thích cách TH79 iMove thu thập, sử dụng, lưu trữ và bảo vệ thông tin khi người dùng sử dụng các ứng dụng và dịch vụ thuộc hệ sinh thái TH79 iMove.</p>
          <div className="privacy-meta"><span>Ngày cập nhật: <b>{UPDATED_AT}</b></span><span>Phiên bản: <b>1.0</b></span></div>
        </div>

        <div className="privacy-notice">
          <ShieldCheck size={22}/>
          <div><strong>Cam kết minh bạch dữ liệu</strong><p>TH79 iMove chỉ xử lý dữ liệu cần thiết để cung cấp, vận hành, bảo vệ và cải thiện dịch vụ. Chúng tôi không bán dữ liệu cá nhân của người dùng cho nhà quảng cáo.</p></div>
        </div>

        <Section id="pham-vi" title="1. Phạm vi áp dụng">
          <p>Chính sách này áp dụng cho các ứng dụng và dịch vụ do Công ty TNHH Đầu tư T&amp;H 79 vận hành dưới thương hiệu TH79 iMove, bao gồm:</p>
          <ul>
            <li><b>TH79 iMove</b> – ứng dụng dành cho khách hàng, gói <code>com.th79.imove</code>.</li>
            <li><b>TH79 iMove Driver</b> – ứng dụng dành cho tài xế, gói <code>com.th79.imove.driver</code>.</li>
            <li><b>TH79 iMove Merchant</b> – ứng dụng dành cho nhà hàng/cửa hàng đối tác, gói <code>com.th79.imove.merchant</code>.</li>
            <li>Các website, hệ thống quản trị và API liên quan trực tiếp đến việc cung cấp dịch vụ TH79 iMove.</li>
          </ul>
        </Section>

        <Section id="du-lieu" title="2. Dữ liệu chúng tôi có thể thu thập">
          <div className="privacy-data-grid">
            <DataCard icon={UserRoundCheck} title="Thông tin tài khoản">Họ tên, số điện thoại, email (nếu có), ảnh đại diện, vai trò tài khoản, thông tin xác thực và trạng thái tài khoản.</DataCard>
            <DataCard icon={MapPin} title="Vị trí và hành trình">Vị trí thiết bị, điểm đón, điểm đến, tuyến đường, thời gian và trạng thái chuyến/đơn nhằm phục vụ đặt xe, giao hàng và điều phối.</DataCard>
            <DataCard icon={Database} title="Dữ liệu giao dịch dịch vụ">Thông tin chuyến đi, đơn hàng, lịch sử hoạt động, cước/phí, phương thức thanh toán, điểm/ưu đãi và các giao dịch liên quan.</DataCard>
            <DataCard icon={ShieldCheck} title="Thông tin tài xế và đối tác">Thông tin phương tiện, giấy tờ xác minh, ảnh KYC, thông tin cửa hàng, menu/sản phẩm và dữ liệu cần thiết để xác minh, vận hành dịch vụ.</DataCard>
            <DataCard icon={LockKeyhole} title="Thông tin kỹ thuật và bảo mật">Loại thiết bị, phiên bản ứng dụng, hệ điều hành, địa chỉ IP, mã phiên đăng nhập, nhật ký lỗi, nhật ký bảo mật và dữ liệu chống gian lận.</DataCard>
            <DataCard icon={Trash2} title="Dữ liệu hỗ trợ">Nội dung yêu cầu hỗ trợ, phản hồi, khiếu nại và thông tin người dùng chủ động cung cấp khi liên hệ với TH79 iMove.</DataCard>
          </div>
          <p>Tùy loại tài khoản và tính năng đang sử dụng, một số nhóm dữ liệu nêu trên có thể không được thu thập.</p>
        </Section>

        <Section id="muc-dich" title="3. Mục đích sử dụng dữ liệu">
          <p>TH79 iMove có thể sử dụng dữ liệu cho các mục đích sau:</p>
          <ul>
            <li>Tạo, xác thực và quản lý tài khoản.</li>
            <li>Cung cấp chức năng đặt chuyến, giao hàng, mua hộ, đặt món và các dịch vụ liên quan.</li>
            <li>Tìm kiếm, ghép nối và điều phối tài xế hoặc đối tác phù hợp.</li>
            <li>Tính cước, phí nền tảng, điểm, ưu đãi và đối soát giao dịch.</li>
            <li>Gửi thông báo về đơn/chuyến, thay đổi trạng thái, bảo mật và thông tin dịch vụ.</li>
            <li>Thực hiện KYC, xác minh danh tính, phòng chống gian lận, lạm dụng và truy cập trái phép.</li>
            <li>Hỗ trợ khách hàng, giải quyết khiếu nại và xử lý sự cố.</li>
            <li>Phân tích hiệu năng, sửa lỗi, duy trì an toàn và cải thiện chất lượng sản phẩm.</li>
            <li>Thực hiện nghĩa vụ pháp lý hoặc yêu cầu hợp lệ từ cơ quan có thẩm quyền khi áp dụng.</li>
          </ul>
        </Section>

        <Section id="chia-se" title="4. Chia sẻ và công bố dữ liệu">
          <p>TH79 iMove chỉ chia sẻ dữ liệu trong phạm vi cần thiết để cung cấp dịch vụ hoặc đáp ứng yêu cầu hợp pháp. Các bên có thể nhận một phần dữ liệu gồm:</p>
          <ul>
            <li><b>Tài xế:</b> nhận thông tin cần thiết của khách hàng/đơn để thực hiện chuyến hoặc giao hàng.</li>
            <li><b>Nhà hàng/cửa hàng:</b> nhận nội dung đơn và thông tin cần thiết để chuẩn bị, xác nhận và bàn giao đơn.</li>
            <li><b>Nhà cung cấp hạ tầng và dịch vụ kỹ thuật:</b> dịch vụ máy chủ, cơ sở dữ liệu, bản đồ, thông báo, lưu trữ và bảo mật được TH79 iMove sử dụng để vận hành hệ thống.</li>
            <li><b>Cơ quan nhà nước có thẩm quyền:</b> khi có yêu cầu hợp pháp theo quy định áp dụng.</li>
          </ul>
          <p>TH79 iMove không bán dữ liệu cá nhân cho nhà quảng cáo và không cho phép bên thứ ba sử dụng dữ liệu nhận được từ TH79 iMove cho mục đích không liên quan đến việc cung cấp dịch vụ đã thỏa thuận.</p>
        </Section>

        <Section id="vi-tri" title="5. Dữ liệu vị trí">
          <p>Dữ liệu vị trí là thành phần quan trọng của dịch vụ vận chuyển và giao nhận. TH79 iMove có thể sử dụng vị trí chính xác hoặc gần đúng để:</p>
          <ul>
            <li>Xác định điểm đón, điểm đến và vị trí hiện tại của người dùng.</li>
            <li>Tìm và điều phối tài xế gần vị trí yêu cầu.</li>
            <li>Hiển thị tuyến đường, hỗ trợ điều hướng và cập nhật tiến trình chuyến.</li>
            <li>Đối với tài xế, duy trì trạng thái vận hành khi tài xế chủ động Online hoặc đang thực hiện chuyến, theo các quyền vị trí mà thiết bị cho phép.</li>
          </ul>
          <p>Người dùng có thể quản lý quyền vị trí trong phần cài đặt của thiết bị. Việc từ chối hoặc thu hồi quyền vị trí có thể làm một số tính năng cốt lõi hoạt động không đầy đủ.</p>
        </Section>

        <Section id="bao-mat" title="6. Bảo mật và thời gian lưu trữ">
          <p>TH79 iMove áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để hạn chế truy cập, sử dụng hoặc tiết lộ dữ liệu trái phép, bao gồm cơ chế xác thực, phân quyền, kiểm soát truy cập và ghi nhận nhật ký vận hành.</p>
          <p>Dữ liệu được lưu trong thời gian cần thiết để cung cấp dịch vụ, duy trì tài khoản, giải quyết tranh chấp, phòng chống gian lận và đáp ứng nghĩa vụ pháp lý. Khi không còn cần thiết, dữ liệu sẽ được xóa, ẩn danh hoặc hạn chế xử lý theo quy trình phù hợp.</p>
        </Section>

        <Section id="quyen" title="7. Quyền và lựa chọn của người dùng">
          <p>Tùy quy định áp dụng và tính chất dữ liệu, người dùng có thể yêu cầu:</p>
          <ul>
            <li>Truy cập hoặc nhận thông tin về dữ liệu cá nhân đang được xử lý.</li>
            <li>Chỉnh sửa thông tin không chính xác hoặc cập nhật thông tin tài khoản.</li>
            <li>Thu hồi một số quyền của ứng dụng từ cài đặt thiết bị.</li>
            <li>Yêu cầu xóa tài khoản và dữ liệu liên quan theo mục 8 dưới đây.</li>
            <li>Liên hệ TH79 iMove để đặt câu hỏi hoặc khiếu nại về quyền riêng tư.</li>
          </ul>
        </Section>

        <Section id="xoa" title="8. Xóa tài khoản và dữ liệu">
          <p>Người dùng có thể yêu cầu xóa tài khoản TH79 iMove và dữ liệu gắn với tài khoản. Khi nhận được yêu cầu hợp lệ, TH79 iMove sẽ xác minh người yêu cầu và xử lý việc xóa hoặc ẩn danh dữ liệu, ngoại trừ phần dữ liệu cần tiếp tục lưu theo nghĩa vụ pháp lý, yêu cầu an toàn, chống gian lận hoặc giải quyết tranh chấp.</p>
          <div className="privacy-delete-box">
            <h3>Cách gửi yêu cầu</h3>
            <ol>
              <li>Sử dụng chức năng <b>Xóa tài khoản</b> trong ứng dụng khi chức năng này khả dụng; hoặc</li>
              <li>Liên hệ TH79 iMove bằng thông tin hỗ trợ được công bố trên Google Play và website chính thức, cung cấp số điện thoại/tài khoản cần xóa để phục vụ xác minh.</li>
            </ol>
            <p>Không gửi mật khẩu, mã OTP hoặc thông tin đăng nhập nhạy cảm trong yêu cầu hỗ trợ.</p>
          </div>
        </Section>

        <Section id="tre-em" title="9. Quyền riêng tư của trẻ em">
          <p>TH79 iMove không được thiết kế như một dịch vụ dành riêng cho trẻ em. Người dùng phải đáp ứng điều kiện độ tuổi và năng lực sử dụng dịch vụ theo quy định áp dụng và điều khoản của TH79 iMove. Nếu phát hiện dữ liệu của trẻ em được cung cấp không phù hợp, TH79 iMove sẽ xem xét và xử lý theo quy định liên quan.</p>
        </Section>

        <Section id="thay-doi" title="10. Thay đổi chính sách">
          <p>Chính sách này có thể được cập nhật để phản ánh thay đổi của sản phẩm, cách thức xử lý dữ liệu hoặc yêu cầu pháp lý. Ngày cập nhật mới nhất được hiển thị ở đầu trang. Khi có thay đổi quan trọng, TH79 iMove có thể thông báo thông qua ứng dụng, website hoặc kênh liên hệ phù hợp.</p>
        </Section>

        <Section id="lien-he" title="11. Liên hệ">
          <div className="privacy-contact-card">
            <div><strong>Công ty TNHH Đầu tư T&amp;H 79</strong><p>Đơn vị vận hành hệ sinh thái TH79 iMove.</p></div>
            <dl>
              <div><dt>Website</dt><dd><a href="https://daututh79.com" target="_blank" rel="noreferrer">https://daututh79.com <ExternalLink size={14}/></a></dd></div>
              <div><dt>Trang chính sách</dt><dd><a href="https://imove.daututh79.com/privacy">https://imove.daututh79.com/privacy</a></dd></div>
              <div><dt>Hotline</dt><dd><a href="tel:0335555066">0335 555 066</a></dd></div>
              <div><dt>Email hỗ trợ</dt><dd>Vui lòng sử dụng email nhà phát triển được công bố trên trang Google Play của ứng dụng TH79 iMove.</dd></div>
            </dl>
          </div>
        </Section>

        <footer className="privacy-footer">
          <p>© 2026 Công ty TNHH Đầu tư T&amp;H 79. TH79 iMove.</p>
          <a href="#top" onClick={(event)=>{event.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}}>Về đầu trang</a>
        </footer>
      </article>
    </div>
  </main>;
}
