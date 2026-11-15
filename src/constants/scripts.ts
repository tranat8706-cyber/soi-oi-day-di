import type { RoleId } from "./roles";

/**
 * Kịch bản luân phiên: mỗi thứ 6 phiên bản, cùng bản chất luật nhưng đổi cách nói
 * để mỗi ván nghe một kiểu. Chọn bản theo số ván (`gameNo`), xem `pickScript`.
 */
export const SCRIPT_VARIANTS = 6;

/** Chọn phiên bản theo số ván (và thêm độ lệch, ví dụ số đêm, để mỗi đêm một kiểu). */
export const pickScript = <T>(list: readonly T[], gameNo: number, offset = 0): T =>
  list[(((gameNo + offset) % list.length) + list.length) % list.length];

/** Lời giới thiệu vai khi người chơi lật bài. */
export const ROLE_INTRO: Record<RoleId, readonly string[]> = {
  WOLF: [
    "Mỗi đêm, cùng bầy Sói mở mắt và chọn một người để cắn. Ban ngày, giả làm dân lành. Sói thắng khi số Sói bằng số người còn lại.",
    "Đêm xuống là giờ đi săn: cả bầy mở mắt, thống nhất cắn một người. Sáng ra diễn cho tròn vai dân hiền. Bầy đông bằng làng là thắng.",
    "Bạn là thợ săn bóng đêm. Mỗi đêm cùng đồng bọn chỉ tay chọn con mồi. Ban ngày cãi như dân, bỏ phiếu như dân, nhưng nhớ ai là người nhà.",
    "Nhiệm vụ đơn giản: đêm cắn, ngày diễn. Cả bầy cùng chọn một nạn nhân mỗi đêm. Khi số Sói bằng số người còn lại, cả làng là của bạn.",
    "Bạn mang lốt người nhưng ruột là Sói. Đêm nào cũng cùng bầy chọn một người để xử. Ngày lên tiếng bênh dân, tố người vô tội, miễn đừng lộ.",
    "Đêm: mở mắt, nhìn đồng bọn, chỉ một người để cắn. Ngày: làm mặt ngây thơ. Sói thắng khi đông bằng phe còn lại, nên giữ mạng anh em.",
  ],
  VILLAGER: [
    "Không phép, không khiên, không bình thuốc. Vũ khí duy nhất của bạn là cái miệng (và cái đầu, nếu có). Đêm ngủ cho ngoan, ngày cãi cho hăng, treo đúng Sói thì mới không vô dụng.",
    "Bạn là dân thường, ban đêm ngủ say. Sức mạnh nằm ở lá phiếu ban ngày: nghe kỹ, nhìn kỹ, chỉ tay đúng Sói.",
    "Không có phép gì cả, nhưng làng thắng hay thua là nhờ những người như bạn. Quan sát ai nói nhiều, ai né tránh, rồi bỏ phiếu cho chuẩn.",
    "Đêm nhắm mắt ngủ, sáng mở mồm cãi. Bạn không biết ai là ai, nên hãy suy luận. Treo trúng Sói là bạn có công lớn.",
    "Dân làng chân chất: không soi, không cứu, không bắn. Bạn chỉ có lý lẽ và trực giác. Đừng để ai dắt mũi.",
    "Vai đơn giản nhất nhưng quan trọng nhất: một lá phiếu tỉnh táo. Ban đêm ngủ, ban ngày tìm ra Sói và kéo cả làng theo mình.",
  ],
  SEER: [
    "Mỗi đêm, chọn một người. Quản trò sẽ cho bạn biết người đó có phải Sói hay không. Dùng sự thật cho khéo, kẻo bị cắn trước.",
    "Bạn có con mắt thứ ba: mỗi đêm chỉ vào một người, Quản trò gật nếu là Sói, lắc nếu không. Biết nhiều thì dễ chết, nên lộ đúng lúc.",
    "Đêm nào cũng được soi một người xem có phải Sói không. Bạn là nỗi sợ của cả bầy. Dẫn dắt làng khéo léo, đừng khoe vội.",
    "Mỗi đêm một lượt soi: chỉ tay, nhìn Quản trò gật hay lắc. Sói sẽ tìm bạn đầu tiên, nên giấu mình và nói chuyện bằng chứng.",
    "Bạn nhìn thấu lòng người: mỗi đêm biết chắc một người có phải Sói. Gom đủ bằng chứng rồi hãy tung ra cho cả làng.",
    "Chỉ vào một người mỗi đêm để biết họ có phải Sói. Tin của bạn là vàng, nhưng nói sớm quá là bị cắn liền.",
  ],
  GUARD: [
    "Mỗi đêm, chọn một người để che chắn. Nếu Sói cắn đúng người đó, họ sống sót. Không được bảo vệ cùng một người hai đêm liền.",
    "Bạn là tấm khiên của làng: mỗi đêm che cho một người, Sói cắn trúng người đó thì vô ích. Không che một người hai đêm liền.",
    "Đêm nào cũng chọn một người để canh. Sói mò tới đúng chỗ là về tay trắng. Luật: không canh cùng một người hai đêm liên tiếp.",
    "Mỗi đêm bạn đứng gác trước cửa một nhà. Người đó bị Sói cắn cũng không sao. Đổi người mỗi đêm, đoán xem Sói sẽ nhắm vào ai.",
    "Cứu người bằng cách đoán trúng: mỗi đêm che một người khỏi răng Sói. Không được che lại người vừa che đêm trước.",
    "Bạn bảo vệ một người mỗi đêm. Đoán đúng nạn nhân là cả làng nợ bạn một mạng. Nhớ: hai đêm liền không che cùng một người.",
  ],
  WITCH: [
    "Bạn có 2 bình, mỗi bình dùng 1 lần cả ván. Bình cứu: cứu người vừa bị Sói cắn. Bình độc: giết một người bất kỳ. Dùng hết cả hai bình thì từ đó bạn chỉ còn là Dân làng, nên đừng phí.",
    "Hai bình thuốc, mỗi bình một lần: bình cứu kéo nạn nhân của Sói về từ cõi chết, bình độc tiễn bất kỳ ai lên đường. Dùng đúng lúc là lật kèo.",
    "Mỗi đêm Quản trò cho bạn biết ai vừa bị cắn. Bạn có một bình cứu và một bình độc cho cả ván. Hết bình thì chỉ còn là Dân làng.",
    "Bạn nắm sinh tử trong tay: một lần cứu người bị Sói cắn, một lần đầu độc người bạn nghi. Mỗi bình chỉ dùng được một lần.",
    "Bình xanh cứu, bình đỏ giết, mỗi loại một lần cả ván. Đừng cứu vội đêm đầu, đừng độc nhầm người nhà.",
    "Phù thủy có hai bình: cứu nạn nhân của Sói, hoặc giết một người tùy ý. Mỗi bình một lần. Dùng hết là thành Dân làng thường.",
  ],
  HUNTER: [
    "Khi bạn chết (bị cắn hoặc bị treo), bạn được bắn chết ngay một người bất kỳ. Chỉ một phát duy nhất, nên ngắm cho kỹ. Riêng chết vì bình độc của Phù thủy thì không kịp bắn.",
    "Bạn chết thì không chết một mình: bị cắn hay bị treo đều được bắn theo một người. Bị Phù thủy đầu độc thì không kịp bóp cò.",
    "Một viên đạn, một cơ hội: lúc bạn ngã xuống, chọn ngay một người để bắn chết cùng. Ngắm trúng Sói là gỡ hòa cho làng.",
    "Bạn sống như dân thường, nhưng khi chết (Sói cắn hoặc làng treo) thì kéo theo một người. Chết vì bình độc thì mất phát bắn.",
    "Ai dám động vào bạn sẽ phải trả giá: chết là được bắn một phát. Để ý từ sớm xem ai đáng ăn đạn nhất.",
    "Lá bài trả thù: bị cắn hay bị treo, bạn bắn chết ngay một người. Chỉ một phát, trừ khi chết vì bình độc của Phù thủy.",
  ],
  CUPID: [
    "Đêm đầu tiên, bắn tên ghép đôi 2 người (có thể gồm chính bạn). Một người chết, người kia chết theo vì đau lòng. Nếu cặp đôi khác phe, họ chỉ thắng khi là 2 người cuối cùng còn sống. Bắn xong mũi tên, bạn chỉ còn là Dân làng.",
    "Đêm đầu bạn se duyên cho 2 người, có thể là chính bạn. Từ đó họ sống chết có nhau. Sói yêu dân thì cặp đôi thành phe riêng. Xong việc bạn là Dân làng.",
    "Một mũi tên, hai trái tim: đêm đầu chọn 2 người yêu nhau. Một người chết, người kia chết theo. Khác phe thì phải sống sót tới cuối cùng mới thắng.",
    "Bạn là bà mối của làng. Đêm đầu tiên ghép một cặp (được chọn mình). Họ chung số phận. Ghép xong bạn chơi như Dân làng.",
    "Đêm đầu, chỉ 2 người để thành cặp đôi. Họ biết nhau, sống chết cùng nhau. Cặp khác phe thắng khi chỉ còn hai người họ.",
    "Bắn tên tình yêu vào 2 người ngay đêm đầu. Một người ra đi, người kia đi theo. Có thể tạo drama Sói yêu Dân cực căng.",
  ],
  WILD_CHILD: [
    "Đêm đầu tiên, chọn một người làm thần tượng. Còn thần tượng sống, bạn là Dân làng. Thần tượng chết, bạn hóa Sói và dậy cùng bầy từ đêm sau.",
    "Bạn chọn một người để noi gương ngay đêm đầu. Thần tượng còn sống thì bạn theo phe Làng. Thần tượng chết, bạn quay sang làm Sói.",
    "Đứa trẻ cần một hình mẫu: đêm đầu chỉ vào thần tượng của bạn. Mất thần tượng là bạn hóa Sói từ đêm sau.",
    "Đêm đầu chọn một người. Họ sống, bạn là dân tốt. Họ chết, lòng bạn hóa đá và bạn gia nhập bầy Sói.",
    "Bạn đứng giữa hai phe. Chọn thần tượng đêm đầu, rồi cầu cho họ sống lâu. Thần tượng ngã xuống là bạn mọc nanh.",
    "Thần tượng còn thì bạn là Dân làng, thần tượng mất thì bạn là Sói. Chọn kỹ người để thần tượng ngay đêm đầu.",
  ],
  WOLF_SEER: [
    "Bạn là Sói, dậy cắn cùng bầy. Sau đó mỗi đêm được soi riêng một người để biết chính xác vai của họ. Săn Tiên tri trước khi bị lộ.",
    "Sói có mắt thần: cắn cùng bầy, rồi dậy riêng soi một người để biết đúng vai. Tìm ra Tiên tri là bầy thắng nửa ván.",
    "Đêm bạn dậy hai lần: cùng bầy cắn người, rồi một mình soi xem ai giữ vai gì. Báo cho bầy bằng cách cắn đúng người nguy hiểm.",
    "Bạn thuộc bầy Sói, nhưng có thêm con mắt: mỗi đêm biết chính xác vai của một người. Ưu tiên tìm Tiên tri, Phù thủy, Bảo vệ.",
    "Cắn cùng bầy, soi riêng một mình. Quản trò cho bạn thấy lá bài thật của người bạn chỉ. Thông tin là vũ khí.",
    "Sói tiên tri: mỗi đêm được xem lá bài của một người. Biết ai là vai xịn thì cả bầy săn dễ hơn nhiều.",
  ],
  WHITE_WOLF: [
    "Bạn dậy cắn cùng bầy như Sói thường, nhưng bạn chơi một mình. Mỗi đêm chẵn, bạn dậy riêng và được giết một con Sói. Bạn chỉ thắng khi là người cuối cùng còn sống.",
    "Bầy tưởng bạn là đồng bọn, nhưng bạn chỉ chơi cho riêng mình. Đêm chẵn được lén giết một con Sói. Thắng khi chỉ còn mình bạn.",
    "Cắn cùng bầy mỗi đêm, rồi đêm chẵn dậy riêng xử một đồng bọn. Mục tiêu: là người sống sót duy nhất.",
    "Sói đội lốt Sói: bạn ăn cùng bầy nhưng lòng không cùng bầy. Mỗi đêm chẵn được giết một con Sói. Đứng một mình cuối cùng là thắng.",
    "Bạn phản bội cả hai phe. Đêm chẵn được đâm sau lưng một con Sói. Chỉ thắng khi mọi người khác đều đã chết.",
    "Dậy cùng bầy, nhưng đêm chẵn có lượt riêng để giết một Sói. Chiến thắng của bạn là khi chỉ còn bạn trong làng.",
  ],
  FOX: [
    "Mỗi đêm, chỉ vào một người. Quản trò cho biết trong nhóm 3 người (người đó và 2 người còn sống ngồi sát hai bên) có Sói hay không. Đánh hơi trượt (nhóm không có Sói) thì bạn mất phép vĩnh viễn, từ đó chỉ còn là Dân làng.",
    "Mũi bạn rất thính: chỉ một người, biết nhóm 3 người quanh đó có Sói không. Đánh hơi trúng thì giữ phép, trượt là mất phép luôn.",
    "Mỗi đêm ngửi một nhóm 3 người (người bạn chỉ và hai người ngồi cạnh). Có Sói thì Quản trò gật. Không có Sói thì bạn mất phép.",
    "Bạn đánh hơi theo cụm: một người cùng hai hàng xóm còn sống. Ngửi ra Sói là được ngửi tiếp, ngửi trượt là hết phép.",
    "Cáo không biết chính xác ai là Sói, chỉ biết trong 3 người có Sói hay không. Mỗi lần trượt là mất phép vĩnh viễn.",
    "Chỉ vào một người mỗi đêm. Quản trò gật nếu người đó hoặc hai người ngồi sát có Sói. Lắc đầu nghĩa là bạn mất phép từ đêm sau.",
  ],
  CURSED_WOLF: [
    "Bạn là Sói, dậy cắn cùng bầy. Một lần duy nhất trong ván, bầy có thể nguyền người bị cắn: người đó không chết mà hóa thành Sói. Nguyền xong thì bạn như Sói thường.",
    "Bạn cắn cùng bầy, và có một lời nguyền dùng một lần: nạn nhân không chết mà biến thành Sói. Dùng xong thì là Sói thường.",
    "Một lần trong ván, thay vì giết, bầy biến nạn nhân thành đồng bọn. Chọn đúng người có phép là cướp luôn sức mạnh của làng.",
    "Sói có phép nguyền: một lần duy nhất, người bị cắn sẽ mọc lông thành Sói thay vì chết. Sau đó bạn cắn như Sói thường.",
    "Bầy thêm thành viên nhờ bạn: một lần cả ván, nạn nhân đêm đó hóa Sói. Họ mất phép cũ và về phe bầy.",
    "Dậy cùng bầy cắn người. Có một lượt nguyền: người bị cắn không chết mà gia nhập bầy Sói. Chỉ dùng một lần.",
  ],
  WOLF_CUB: [
    "Bạn là Sói, dậy cắn cùng bầy. Nếu bạn chết, bầy Sói nổi giận: đêm kế tiếp được cắn 2 người.",
    "Sói nhỏ nhưng có võ: bạn cắn cùng bầy như thường. Lỡ bạn chết, đêm sau cả bầy trả thù bằng cách cắn 2 người.",
    "Bạn là con út của bầy. Cùng bầy cắn người mỗi đêm. Làng mà giết bạn thì đêm sau bầy được cắn hai lần.",
    "Cắn cùng bầy như Sói thường. Cái chết của bạn khiến bầy nổi điên: đêm kế tiếp cắn 2 người.",
    "Đừng ai dám động vào Sói con: bạn chết là đêm sau bầy được cắn gấp đôi. Ngày thì cứ diễn vô tội.",
    "Bạn dậy cùng bầy. Nếu bị giết, bầy Sói được cắn 2 người vào đêm kế tiếp để trả thù.",
  ],
  ELDER: [
    "Bạn sống dai: chịu được lần đầu bị Sói cắn, lần thứ hai thì chết. Nếu dân làng treo cổ bạn, cả làng bị trời phạt: Tiên tri, Bảo vệ, Phù thủy và mọi vai có phép bên phe Làng đều mất phép (tùy luật nhà).",
    "Già mà gân: Sói cắn lần đầu bạn vẫn sống, lần hai mới chết. Làng mà treo bạn thì các vai phép phe Làng mất phép (tùy luật nhà).",
    "Bạn có hai mạng trước răng Sói. Nhưng nếu chính dân làng treo cổ bạn, trời sẽ phạt: vai có phép bên Làng mất hết phép.",
    "Kinh nghiệm cho bạn thêm một mạng: lần cắn đầu tiên không chết. Đừng để làng treo nhầm, kẻo cả làng mất phép.",
    "Sói phải cắn bạn hai lần mới xong. Làng treo bạn thì chịu trời phạt, các vai phép phe Làng mất phép (theo luật nhà).",
    "Bạn là cây cao bóng cả: chịu được một cú cắn. Ai treo bạn là tự hại làng, vì các vai phép sẽ mất phép.",
  ],
  IDIOT: [
    "Nếu bị dân làng treo cổ, bạn lật bài và được tha vì ai cũng biết bạn ngố, nhưng từ đó mất quyền bỏ phiếu. Bị treo lần nữa thì chết thật.",
    "Làng treo bạn thì bạn lật bài, cả làng cười rồi tha. Nhưng từ đó bạn không được bỏ phiếu. Lần treo thứ hai là chết thật.",
    "Bạn có một vé thoát treo cổ: lật bài là được tha. Đổi lại, mất quyền bỏ phiếu tới hết ván.",
    "Ngố mà may: bị treo lần đầu thì lật bài và sống. Từ đó chỉ được nói, không được giơ tay bỏ phiếu.",
    "Sói cắn thì bạn chết như thường, nhưng bị làng treo thì được tha một lần nhờ lật bài. Mất quyền bầu từ đó.",
    "Một lần duy nhất, khi bị treo cổ, bạn lật bài và thoát chết. Sau đó bạn không bỏ phiếu nữa, bị treo lần hai thì chết.",
  ],
  LYCAN: [
    "Bạn là dân làng, thắng cùng phe Làng, nhưng trong người mang dòng máu Sói: Tiên tri soi bạn sẽ ra Sói. Hãy thuyết phục cả làng tin mình.",
    "Bạn ở phe Làng, nhưng Tiên tri soi bạn lại ra Sói. Bị nghi oan là chuyện thường, cãi cho khéo vào.",
    "Dân làng có dòng máu Sói: bạn chơi cho Làng, nhưng mắt Tiên tri thấy bạn là Sói. Chuẩn bị tinh thần bị tố.",
    "Bạn là người tốt mang vẻ ngoài xấu: Tiên tri nhìn bạn ra Sói. Thắng cùng phe Làng nếu làng tin bạn.",
    "Bán sói: phe Làng chính hiệu, nhưng kết quả soi lại ra Sói. Cái khó là chứng minh mình trong sạch.",
    "Bạn không có phép gì, và còn bị Tiên tri soi ra Sói. Vẫn thắng cùng Làng, miễn đừng bị treo oan.",
  ],
  KAMIKAZE: [
    "Một lần duy nhất trong ván, vào ban đêm, bạn lao vào một người bất kỳ: sáng ra cả hai cùng chết. Không gì cản được. Chưa dùng thì bạn sống như Dân làng; chọn sai thì làng mất hai người.",
    "Bạn có một quả bom dùng một lần: đêm nào muốn thì lao vào một người, sáng ra cả hai cùng chết. Không ai cứu được.",
    "Một đêm trong ván, bạn có thể ôm một người cùng chết. Chọn trúng Sói là đổi một lấy một, chọn sai là làng mất hai.",
    "Bạn sống như Dân làng cho tới khi quyết định hy sinh: lao vào một người, cả hai ra đi lúc bình minh.",
    "Phát nổ một lần duy nhất: bạn và người bạn chọn cùng chết. Bảo vệ hay Phù thủy đều không cản được.",
    "Kẻ cảm tử chờ thời cơ: một đêm nào đó, chỉ tay vào người bạn chắc là Sói. Sáng ra cả hai không còn.",
  ],
  HARLOT: [
    "Mỗi đêm, bạn ngủ lại nhà một người khác. Sói cắn vào nhà bạn thì bạn thoát vì không có ở nhà. Nhưng nếu người bạn ngủ cùng bị Sói cắn chết, hoặc chính là Sói, bạn chết theo. Không được ngủ nhà một người hai đêm liền.",
    "Đêm nào cũng đi ngủ nhờ một nhà. Sói tới nhà bạn thì bạn vắng mặt nên sống. Ngủ trúng nhà Sói hoặc nhà nạn nhân thì chết theo.",
    "Bạn ít khi ở nhà: mỗi đêm chọn một nhà để ngủ. Né được răng Sói, nhưng ngủ nhầm nhà là mất mạng. Không ghé một nhà hai đêm liền.",
    "Mỗi đêm ghé một nhà. Bạn an toàn khỏi Sói cắn tại nhà mình, nhưng chủ nhà chết hoặc là Sói thì bạn đi theo.",
    "Ngủ nhà ai, chung số phận với người đó. Chọn sai là chết, chọn đúng là thoát. Đổi nhà mỗi đêm.",
    "Bạn lang thang mỗi đêm một nhà. Sói đến nhà bạn thì vồ hụt. Nhưng nếu chính chủ nhà là Sói hoặc bị cắn, bạn chết cùng.",
  ],
};

/** Lời Quản trò gọi từng vai ban đêm. Mọi bản đều đủ: ai mở mắt, làm gì, nhắm mắt. */
export const GM_CALL: Partial<Record<RoleId, readonly string[]>> = {
  WOLF: [
    "Sói mở mắt, nhìn nhau. Chỉ tay chọn một người để cắn. Sói nhắm mắt.",
    "Bầy Sói thức dậy, nhận mặt đồng bọn. Đêm nay muốn cắn ai? Thống nhất rồi chỉ tay. Sói nhắm mắt lại.",
    "Trăng lên rồi. Sói mở mắt. Cả bầy chọn một con mồi, chỉ cho tôi. Xong rồi, Sói đi ngủ.",
    "Sói ơi dậy đi. Nhìn quanh, đồng bọn của bạn đây. Chọn một người để cắn. Sói nhắm mắt.",
    "Giờ đi săn đã tới. Sói mở mắt, bàn nhau trong im lặng rồi chỉ một người. Sói nhắm mắt.",
    "Sói mở mắt. Đêm nay ai sẽ là bữa tối? Chỉ tay vào một người. Cảm ơn, Sói nhắm mắt.",
  ],
  SEER: [
    "Tiên tri mở mắt. Chỉ vào người muốn soi. (Gật đầu nếu là Sói, lắc đầu nếu không.) Tiên tri nhắm mắt.",
    "Tiên tri thức dậy. Đêm nay muốn nhìn thấu ai? Chỉ tay. (Gật nếu Sói, lắc nếu không.) Tiên tri đi ngủ.",
    "Tiên tri mở mắt. Con mắt thứ ba muốn nhìn ai? Chỉ vào người đó. (Gật là Sói, lắc là không.) Tiên tri nhắm mắt.",
    "Tiên tri ơi dậy đi. Chọn một người để soi. (Ra hiệu gật hoặc lắc.) Tiên tri nhắm mắt lại.",
    "Tiên tri mở mắt. Bạn nghi ai nhất? Chỉ tay cho tôi. (Gật nếu là Sói, lắc nếu không phải.) Tiên tri nhắm mắt.",
    "Tiên tri thức giấc. Soi một người đêm nay. (Gật: Sói. Lắc: không phải Sói.) Tiên tri đi ngủ.",
  ],
  GUARD: [
    "Bảo vệ mở mắt. Chỉ vào người muốn bảo vệ đêm nay. Bảo vệ nhắm mắt.",
    "Bảo vệ thức dậy. Đêm nay canh cửa nhà ai? Chỉ tay. Bảo vệ nhắm mắt.",
    "Bảo vệ mở mắt. Ai cần được che chở đêm nay? Chỉ cho tôi. Bảo vệ đi ngủ.",
    "Bảo vệ ơi dậy đi. Chọn một người để đứng gác. Bảo vệ nhắm mắt lại.",
    "Bảo vệ mở mắt. Giơ khiên che cho một người. Chỉ tay. Bảo vệ nhắm mắt.",
    "Bảo vệ thức giấc. Đêm nay bảo vệ ai? Bảo vệ nhắm mắt.",
  ],
  WITCH: [
    "Phù thủy mở mắt. Đêm nay người này bị cắn (chỉ tay). Có muốn dùng bình cứu không? Có muốn dùng bình độc lên ai không? Phù thủy nhắm mắt.",
    "Phù thủy thức dậy. Đây là nạn nhân của Sói đêm nay (chỉ tay). Cứu không? Có muốn đầu độc ai không? Phù thủy nhắm mắt.",
    "Phù thủy mở mắt. Sói vừa cắn người này (chỉ tay). Dùng bình cứu chứ? Còn bình độc, muốn giết ai không? Phù thủy đi ngủ.",
    "Phù thủy ơi dậy đi. Người này vừa bị cắn (chỉ tay). Gật để cứu, lắc để thôi. Có muốn đầu độc ai không? Phù thủy nhắm mắt.",
    "Phù thủy mở mắt. Nhìn đây, nạn nhân đêm nay (chỉ tay). Bình cứu: có hay không? Bình độc: chỉ vào ai, hoặc lắc đầu. Phù thủy nhắm mắt.",
    "Phù thủy thức giấc. Đêm nay người này gặp nạn (chỉ tay). Có cứu không? Có muốn tiễn ai lên đường không? Phù thủy nhắm mắt.",
  ],
  CUPID: [
    "Thần tình yêu mở mắt. Chỉ vào 2 người sẽ yêu nhau. Thần tình yêu nhắm mắt. (Chạm vai 2 người đó: mở mắt nhìn nhau rồi nhắm lại.)",
    "Thần tình yêu thức dậy. Bắn tên vào 2 người, chỉ cho tôi. Thần tình yêu nhắm mắt. (Chạm vai cặp đôi: mở mắt nhận mặt nhau rồi nhắm lại.)",
    "Thần tình yêu mở mắt. Đêm nay se duyên cho ai với ai? Chỉ 2 người. Thần tình yêu đi ngủ. (Chạm vai 2 người: mở mắt nhìn nhau, rồi nhắm.)",
    "Thần tình yêu ơi dậy đi. Chọn 2 trái tim để ghép. Thần tình yêu nhắm mắt. (Chạm vai hai người được ghép: nhìn nhau rồi nhắm mắt.)",
    "Thần tình yêu mở mắt. Chỉ vào cặp đôi định mệnh. Thần tình yêu nhắm mắt. (Người được tôi chạm vai, mở mắt nhìn người yêu của mình rồi nhắm lại.)",
    "Thần tình yêu thức giấc. Ghép một cặp, có thể là chính bạn. Thần tình yêu nhắm mắt. (Chạm vai 2 người: mở mắt nhìn nhau rồi nhắm.)",
  ],
  WILD_CHILD: [
    "Đứa trẻ hoang mở mắt. Chỉ vào người bạn chọn làm thần tượng. Đứa trẻ hoang nhắm mắt.",
    "Đứa trẻ hoang thức dậy. Ai là thần tượng của bạn? Chỉ tay. Đứa trẻ hoang nhắm mắt.",
    "Đứa trẻ hoang mở mắt. Chọn một người để noi gương. Đứa trẻ hoang đi ngủ.",
    "Đứa trẻ hoang ơi dậy đi. Chỉ vào thần tượng. Đứa trẻ hoang nhắm mắt lại.",
    "Đứa trẻ hoang mở mắt. Bạn muốn lớn lên giống ai? Chỉ cho tôi. Đứa trẻ hoang nhắm mắt.",
    "Đứa trẻ hoang thức giấc. Chọn thần tượng. Đứa trẻ hoang nhắm mắt.",
  ],
  WOLF_SEER: [
    "Sói tiên tri mở mắt. Chỉ vào người muốn soi. (Ra hiệu vai của người đó.) Sói tiên tri nhắm mắt.",
    "Sói tiên tri thức dậy. Muốn biết vai của ai? Chỉ tay. (Cho xem lá bài.) Sói tiên tri nhắm mắt.",
    "Sói tiên tri mở mắt. Soi một người, tôi sẽ cho bạn thấy vai thật. Sói tiên tri đi ngủ.",
    "Sói tiên tri ơi dậy đi. Chỉ vào người đáng nghi. (Ra hiệu vai.) Sói tiên tri nhắm mắt lại.",
    "Sói tiên tri mở mắt. Đêm nay nhìn thấu ai? (Giơ màn hình cho xem lá bài.) Sói tiên tri nhắm mắt.",
    "Sói tiên tri thức giấc. Chỉ một người để xem bài. Sói tiên tri nhắm mắt.",
  ],
  WHITE_WOLF: [
    "Sói trắng mở mắt. Có muốn giết một con Sói không? Chỉ tay. Sói trắng nhắm mắt.",
    "Sói trắng thức dậy. Đêm nay có muốn xử đồng bọn nào không? Chỉ tay hoặc lắc đầu. Sói trắng nhắm mắt.",
    "Sói trắng mở mắt. Muốn đâm sau lưng con Sói nào không? Sói trắng đi ngủ.",
    "Sói trắng ơi dậy đi. Chọn một con Sói để loại, hoặc lắc đầu. Sói trắng nhắm mắt lại.",
    "Sói trắng mở mắt. Bầy đang ngủ say. Có muốn ra tay với ai trong bầy không? Sói trắng nhắm mắt.",
    "Sói trắng thức giấc. Giết một con Sói, hay tha đêm nay? Sói trắng nhắm mắt.",
  ],
  FOX: [
    "Cáo mở mắt. Chỉ vào một người. (Gật nếu nhóm 3 người có Sói, lắc nếu không.) Cáo nhắm mắt.",
    "Cáo thức dậy. Muốn đánh hơi quanh ai? Chỉ tay. (Gật: nhóm 3 người có Sói. Lắc: không có.) Cáo nhắm mắt.",
    "Cáo mở mắt. Ngửi thử một người và hai người ngồi cạnh. (Gật hoặc lắc.) Cáo đi ngủ.",
    "Cáo ơi dậy đi. Chỉ vào một người để đánh hơi. (Có Sói thì gật, không thì lắc.) Cáo nhắm mắt lại.",
    "Cáo mở mắt. Mũi thính đêm nay hướng về ai? (Gật nếu cụm 3 người có Sói.) Cáo nhắm mắt.",
    "Cáo thức giấc. Chỉ một người. (Gật: có mùi Sói. Lắc: sạch.) Cáo nhắm mắt.",
  ],
  KAMIKAZE: [
    "Kẻ cảm tử mở mắt. Đêm nay có muốn lao vào ai không? Chỉ tay, hoặc lắc đầu. Kẻ cảm tử nhắm mắt.",
    "Kẻ cảm tử thức dậy. Đã tới lúc hy sinh chưa? Chỉ tay vào một người, hoặc lắc đầu. Kẻ cảm tử nhắm mắt.",
    "Kẻ cảm tử mở mắt. Muốn ôm ai cùng ra đi không? Chỉ tay hoặc lắc. Kẻ cảm tử đi ngủ.",
    "Kẻ cảm tử ơi dậy đi. Dùng quả bom đêm nay không? Chỉ người, hoặc lắc đầu. Kẻ cảm tử nhắm mắt lại.",
    "Kẻ cảm tử mở mắt. Đêm nay có phát nổ không? Chỉ một người hoặc lắc. Kẻ cảm tử nhắm mắt.",
    "Kẻ cảm tử thức giấc. Lao vào ai, hay để dành? Kẻ cảm tử nhắm mắt.",
  ],
  HARLOT: [
    "Con điếm mở mắt. Đêm nay ngủ nhà ai? Chỉ tay. Con điếm nhắm mắt.",
    "Con điếm thức dậy. Tối nay ghé nhà ai? Chỉ tay, hoặc lắc đầu để ở nhà. Con điếm nhắm mắt.",
    "Con điếm mở mắt. Đêm nay qua đêm ở đâu? Chỉ cho tôi. Con điếm đi ngủ.",
    "Con điếm ơi dậy đi. Chọn một nhà để ngủ nhờ. Con điếm nhắm mắt lại.",
    "Con điếm mở mắt. Ai sẽ có khách đêm nay? Chỉ tay. Con điếm nhắm mắt.",
    "Con điếm thức giấc. Đêm nay ngủ ở nhà ai? Con điếm nhắm mắt.",
  ],
};

/** Câu mở màn đêm Quản trò đọc to trước khi gọi vai. */
export const NIGHTFALL_SAY = [
  "Màn đêm buông xuống. Cả làng nhắm mắt, cúi đầu, không ai được hé nhìn.",
  "Trời tối rồi. Mọi người nhắm mắt lại, giữ im lặng tuyệt đối.",
  "Làng chìm vào giấc ngủ. Nhắm mắt lại, và cầu cho mình còn thấy bình minh.",
  "Đêm đen kéo tới. Cả làng nhắm mắt. Ai hé là bị tôi bắt quả tang.",
  "Gà đã lên chuồng, đèn đã tắt. Mọi người nhắm mắt đi ngủ.",
  "Một đêm nữa lại tới. Cả làng nhắm mắt, gõ nhẹ tay xuống bàn cho Sói khỏi lộ tiếng động.",
] as const;

/** Lời công bố buổi sáng. {who} là tên người chết. */
export const MORNING_SAY = {
  none: [
    "Đêm qua vô cùng tĩnh lặng, không có ai ngã xuống. Làng đang được thần linh che chở.",
    "Bình minh lên, cả làng đông đủ. Một đêm bình yên hiếm hoi.",
    "Sáng nay không ai vắng mặt. Sói đói meo, hay có ai đó đã ra tay cứu?",
    "Gà gáy, mọi người tỉnh dậy, không thiếu một ai. Chuyện gì đã xảy ra đêm qua?",
    "Đêm qua yên ả lạ thường. Không ai chết cả. Đừng vội mừng.",
    "Cả làng thức dậy nguyên vẹn. Sói ra tay mà hụt, hay đang giấu bài?",
  ],
  one: [
    "Đêm qua là một đêm đẫm máu. {who} đã ra đi. Xin mời {who} để lại di ngôn trước khi rời làng.",
    "Bình minh lên, làng thiếu mất một người: {who} đã không qua khỏi. Mời {who} nói lời cuối.",
    "Sáng nay người ta tìm thấy {who} nằm bất động. {who} có một câu trăng trối, rồi rời bàn.",
    "Tin buồn: {who} đã ra đi trong đêm. Mời {who} để lại di ngôn cho làng.",
    "Đêm qua có tiếng hét thất thanh. {who} không còn nữa. Xin mời {who} nói lời cuối.",
    "Làng mất {who} trong đêm. Một phút mặc niệm, rồi mời {who} để lại di ngôn.",
  ],
  many: [
    "Đêm qua là một đêm đẫm máu. Cả {who} đều đã ra đi. Xin mời từng người để lại di ngôn.",
    "Bình minh đỏ như máu: {who} đều không qua khỏi. Mời từng người nói lời cuối.",
    "Sáng nay làng mất cùng lúc {who}. Mời lần lượt từng người để lại di ngôn.",
    "Một đêm kinh hoàng: {who} đã ra đi. Mỗi người được nói một câu cuối.",
    "Tin dữ dồn dập: {who} không còn nữa. Mời từng người trăng trối rồi rời bàn.",
    "Đêm qua Sói và bóng tối đã cướp đi {who}. Xin mời từng người để lại di ngôn.",
  ],
} as const;

/** Câu Quản trò đọc khi một người bị treo. {who} là tên người bị treo. */
export const VERDICT_SAY = [
  "Mời {who} nói lời cuối rồi rời bàn. Từ giờ {who} im lặng, không được gợi ý cho ai.",
  "{who}, làng đã quyết. Một câu trăng trối, rồi bạn chỉ còn là khán giả im lặng.",
  "Dây đã thắt. Mời {who} nói lời cuối. Sau đó không được nói, không được ra hiệu.",
  "{who} bước lên giàn lần cuối. Có gì muốn nhắn lại không? Từ giờ bạn im lặng nhé.",
  "Làng đã chọn {who}. Một câu cuối thôi, rồi giữ im lặng tới hết ván.",
  "Vĩnh biệt {who}. Mời nói lời cuối, sau đó ngồi xem, không được bật mí gì.",
] as const;

export const fill = (tpl: string, who: string) => tpl.replaceAll("{who}", who);
