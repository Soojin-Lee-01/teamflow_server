const workSpaceModel = require('../models/Workspace');
const userModel = require('../models/User');
const workSpaceMemberModel = require('../models/WorkspaceMember');
const chatRoomModel = require('../models/ChatRoom');
const sendEmailMiddleware = require('../middlewares/emailMiddleware'); // 이메일 미들웨어
const responseUtil = require('../utils/ResponseUtil');
const crypto = require('crypto');
const WorkspaceMember = require('../models/WorkspaceMember');

// 워크스페이스 생성
exports.postSpaceCreate = async (req, res) => {
  try {
    let uniquePassword = await generateUniqueCode();
    const userId = req.session.passport?.user?.user_id;

    // 워크스페이스 생성
    const workSpace = await workSpaceModel.create({
      space_title: req.body.space_title,
      space_description: req.body.space_description,
      space_password: uniquePassword,
      user_id: req.session.passport?.user?.user_id,
    });

    // 생성한 워크스페이스에 생성자 추가
    await workSpaceMemberModel.create({
      space_id: workSpace.space_id,
      user_id: userId,
    });

    // 워크스페이스의 채팅방 생성
    const chatRoom = await chatRoomModel.create({
      workspace_id: workSpace.space_id,
    });

    res.send(
      responseUtil('SUCCESS', '워크스페이스가 생성되었습니다.', {
        space_password: uniquePassword,
      })
    );
  } catch (err) {
    console.error(err);
    res.send(
      responseUtil('ERROR', '워크스페이스 생성에 실패하였습니다.', null)
    );
  }
};

// 고유한 암호화 패스워드 생성 (중복 확인 포함)
async function generateUniqueCode() {
  let isDuplicate = true;
  let uniqueCode;

  // 중복이 아닌 패스워드가 나올때 까지 반복
  while (isDuplicate) {
    //새로운 패스워드를 패스워드 생성함수로 부터 받아옴
    uniqueCode = createPasswordCode();
    //DB에 같은 패스워드 값이 있는지 중복확인
    const existingSpace = await workSpaceModel.findOne({
      where: { space_password: uniqueCode },
    });
    // DB 조회 반환값이 존재하지 않으면 재발급 중단
    if (!existingSpace) {
      isDuplicate = false;
    }
  }
  return uniqueCode;
}

// 패스워드 생성함수 (현재 날짜와 랜덤 문자를 섞어서)
function createPasswordCode() {
  // 현재 시간을 36진수로 변환
  const timestamp = Date.now().toString(36).toUpperCase();
  // 6자리 랜덤 16진수
  const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${timestamp}-${randomBytes}`;
}

// 특정 워크스페이스 조회
exports.getSpace = async (req, res) => {
  try {
    const spaceId = req.params.space_id;
    const workSpace = await workSpaceModel.findOne({
      where: {
        space_id: spaceId,
      },
    });
    res.send(
      responseUtil('SUCCESS', '워크스페이스 조회성공', {
        ...workSpace.dataValues,
      })
    );
  } catch (err) {
    console.log('getWorkSpace Controller Err:', err);
    res.send(
      responseUtil('ERROR', '워크스페이스 조회에 실패하였습니다.', null)
    );
  }
};

// 워크스페이스 해체하기(호스트)
exports.postSpaceDestroy = async (req, res) => {
  try {
    const spaceId = req.params.space_id;
    const userId = req.session.passport?.user?.user_id;

    const workSpace = await workSpaceModel.findOne({
      where: {
        space_id: spaceId,
      },
      attributes: ['space_id', 'user_id'],
    });

    // 조회한 값이 없을때
    if (!workSpace)
      return res.send(
        responseUtil('ERROR', '해당 워크스페이스를 찾을 수 없습니다.', null)
      );
    // 호스트가 맞는지
    if (workSpace.user_id !== userId) {
      return res.send(
        responseUtil(
          'ERROR',
          '호스트만 워크스페이스 해체를 할 수 있습니다.',
          null
        )
      );
    }
    // 워크스페이스 해체
    await workSpace.destroy();

    res.send(responseUtil('SUCCESS', '워크스페이스 삭제 하였습니다.', null));
  } catch (error) {
    console.log('postSpaceDestroy Controller Err:', error);
    res.send(responseUtil('ERROR', '워크스페이스 삭제 실패하였습니다.', null));
  }
};

// 워크스페이스 탈퇴(참여자)
exports.postSpaceLeave = async (req, res) => {
  try {
    const spaceId = req.params.space_id;
    const userId = req.session.passport?.user?.user_id;

    const workSpaceMember = await workSpaceMemberModel.findOne({
      where: {
        space_id: spaceId,
        user_id: userId,
      },
    });

    const workSpace = await workSpaceModel.findOne({
      where: {
        space_id: spaceId,
      },
      attributes: ['user_id'],
    });

    // 탈퇴 하려는 워크스페이스의 멤버가 아닐때
    if (!workSpaceMember)
      return res.send(
        responseUtil('SUCCESS', '참여한 워크스페이스가 없습니다.', null)
      );

    // 탈퇴 요청사용자가 호스트인지 검증
    if (workSpace.user_id === user_id)
      return res.send(
        responseUtil('ERROR', '호스트는 탈퇴가 불가능합니다', null)
      );

    // 탈퇴처리
    await workSpaceMember.destroy();

    // 참여한 워크스페이스 삭제 처리
    res.send(responseUtil('SUCCESS', '워크스페이스 탈퇴 하였습니다.', null));
  } catch (error) {
    console.log('postSpaceMemberOut Controller Err:', error);
    res.send(
      responseUtil('ERROR', '워크스페이스 탈퇴에 실패하였습니다.', null)
    );
  }
};

// 개인별(내가) 참여한 워크스페이스 전체 조회
exports.getMySpace = async (req, res) => {
  try {
    // 세션의 고유번호
    const userId = req.session.passport?.user?.user_id;
    const workSpaceMeber = await workSpaceMemberModel.findAll({
      where: {
        user_id: userId,
      },
      attributes: ['space_id'],
    });

    // 참여한 워크스페이스가 없으면 빈 배열 반환
    if (workSpaceMeber.length === 0)
      return res.send(
        responseUtil('SUCCESS', '참여한 워크스페이스가 없습니다.', null)
      );

    // 내가 참여한 space_id 정보를 필터링
    const myspace = workSpaceMeber.map((item) => item.space_id);

    // 내가 속한 space_id 로 전체 워크스페이스 정보 조회
    const myWorkspace = await workSpaceModel.findAll({
      where: {
        space_id: myspace,
      },
      attributes: ['space_id', 'space_title'],
    });

    res.send(
      responseUtil('SUCCESS', '내가 참여한 워크스페이스 조회성공', myWorkspace)
    );
  } catch (error) {
    console.log('getWorkSpace Controller Err:', error);
    res.send(
      responseUtil(
        'ERROR',
        '내가 참여한 워크스페이스 조회에 실패하였습니다.',
        null
      )
    );
  }
};

// 특정 워크스페이스에 참여한 참여자 전체 조회
exports.getSpaceMember = async (req, res) => {
  try {
    const spaceId = req.params.space_id;

    /**
     * 특정 협업에 속한 참여자 정보 조회
     * {mem_id, space_id, user_id}
     */
    const workSpaceMembers = await workSpaceMemberModel.findAll({
      where: {
        space_id: spaceId,
      },
    });

    // 참여자가 없으면 빈 배열 반환
    if (workSpaceMembers.length === 0) {
      return res.send(
        responseUtil('SUCCESS', '해당 워크스페이스에 참여자가 없습니다.', null)
      );
    }

    const userList = workSpaceMembers.map(
      (member) => member.dataValues.user_id
    );
    const members = await userModel.findAll({
      where: {
        user_id: userList,
      },
      attributes: ['user_id', 'nickname', 'profile_image'],
    });

    return res.send(
      responseUtil(
        'SUCCESS',
        '전체 사용자 조회 성공',
        members.map((member) => ({ spaceId, ...member.dataValues }))
      )
    );
  } catch (error) {
    console.log('postSpaceMember Controller Err:', error);
    res.send(responseUtil('ERROR', '전체 사용자 조회 실패', null));
  }
};

// 워크스페이스 방 참여 신청 POST /v1/workspace/join
exports.postSpaceJoin = async (req, res) => {
  try {
    const { space_password } = req.body;
    const userId = req.session.passport?.user?.user_id;

    // 세션에 user_id가 없을 경우
    if (!userId)
      return res.send(responseUtil('ERROR', '로그인이 필요합니다', null));

    // 워크스페이스 비밀번호가 올바르지 않은 경우
    if (!space_password)
      return res.send(responseUtil('ERROR', '비밀번호를 입력해주세요.', null));

    const findSpace = await workSpaceModel.findOne({
      where: { space_password },
    });

    // 비밀번호에 해당하는 워크스페이스가 없는 경우
    if (!findSpace)
      return res.send(
        responseUtil(
          'ERROR',
          '워크스페이스 비밀번호가 일치하지 않습니다.',
          null
        )
      );

    const spaceId = findSpace.space_id;
    const existingMember = await workSpaceMemberModel.findOne({
      where: { space_id: spaceId, user_id: userId },
    });

    // 이미 가입되어있을 경우
    if (existingMember)
      return res.send(
        responseUtil('ERROR', '이미 이 워크스페이스의 멤버입니다.', null)
      );

    // 워크스페이스의 멤버로 가입
    await workSpaceMemberModel.create({
      space_id: spaceId,
      user_id: userId,
    });
    res.send(
      responseUtil('SUCCESS', '워크스페이스에 성공적으로 참여하였습니다.', null)
    );
  } catch (error) {
    console.log('postSpaceJoin Controller Err:', error);
    res.send(responseUtil('ERROR', '서버 오류가 발생했습니다.', null));
  }
};

// 협업초대 메일발송
exports.postSpaceInvite = async (req, res, next) => {
  try {
    const spaceId = req.params.space_id;
    const { email } = req.body;

    if (!email || !spaceId)
      return res.send(
        responseUtil('ERROR', '이메일과 워크스페이스 ID가 필요합니다.', null)
      );

    // 예제 초대 코드 (실제 서비스에서는 DB에서 가져오거나 생성해야 함)
    const workSpace = await workSpaceModel.findOne({
      where: {
        space_id: spaceId,
      },
      attributes: ['space_password', 'space_title'],
    });

    const workSpaceTitle = workSpace.space_title;
    const inviteCode = workSpace.space_password;

    // 이메일 발송 내용을 req.body에 추가하여 미들웨어에서 사용함!
    req.body.subject = 'TeamFlow - 워크스페이스에 초대되었습니다!';
    req.body.to = email;
    req.body.text = `워크스페이스에 초대되었습니다. 초대 코드: ${inviteCode}`;
    req.body.html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <title>워크스페이스 초대</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333333; margin: 0; padding: 0; background-color: #f2f2f2;">
      <!-- 이메일 전체 컨테이너 -->
      <div style="width: 100%; padding: 30px 0; display: flex; justify-content: center;">
        <!-- 실제 콘텐츠 박스 -->
        <div style="width: 90%; max-width: 600px; background-color: #ffffff; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
          <h1 style="text-align: center; color: #007bff; margin-bottom: 20px;">${workSpaceTitle} 워크스페이스 초대</h1>
          
          <p>📢새로운 워크스페이스에 초대되었습니다!</p>
          <p>아래의 초대 코드를 복사하여 가입 과정에서 입력해주세요.</p>
    
          <!-- 초대코드 박스 -->
          <div style="margin: 20px 0; padding: 15px; background-color: #007bff; color: #ffffff; font-weight: bold; text-align: center; border-radius: 4px; letter-spacing: 1px; font-size: 1.2em;">
            ${inviteCode}
          </div>
    
          <!-- 이동 버튼 -->
          <p style="text-align: center;">
            <a href="https://your-workspace-url.com"
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 0 auto;">
              워크스페이스로 이동
            </a>
          </p>
    
          <p>즐거운 협업 되세요!</p>
    
          <!-- 푸터 -->
          <div style="margin-top: 30px; font-size: 14px; color: #888888; text-align: center;">
            © 2025 TeamFlow Service
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // 이메일 미들웨어 실행
    sendEmailMiddleware(req, res, () => {
      return res.send(
        responseUtil('SUCCESS', '초대 이메일이 전송되었습니다.', {
          emailStatus: req.emailStatus,
        })
      );
    });
  } catch (error) {
    console.error('초대 이메일 전송 오류:', error);
    res.send(
      responseUtil('ERROR', '초대 이메일 전송 중 오류가 발생했습니다.', null)
    );
  }
};
