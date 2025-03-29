const express = require('express');
const controller = require('../controllers/Cworkspace');
const router = express.Router({ mergeParams: true });
const isAuthenticated = require('../middlewares/isAuthenticated');

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: 워크스페이스 관련 API
 */

/**
 * @swagger
 * /v1/workspaces:
 *   post:
 *     summary: 워크스페이스 생성
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               space_title:
 *                 type: string
 *                 example: "내 워크스페이스"
 *               space_description:
 *                 type: string
 *                 example: "프로젝트 협업을 위한 공간"
 *     responses:
 *       201:
 *         description: 워크스페이스가 성공적으로 생성됨
 */
router.post('/', isAuthenticated, controller.postSpaceCreate);

/**
 * @swagger
 * /v1/workspaces/user:
 *   get:
 *     summary: 현재 사용자가 참여한 모든 워크스페이스 조회
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자가 속한 워크스페이스 목록 반환
 */
router.get('/user', isAuthenticated, controller.getMySpace);

/**
 * @swagger
 * /v1/workspaces/{space_id}/invite:
 *   post:
 *     summary: 워크스페이스 초대
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 워크스페이스 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: 초대가 성공적으로 전송됨
 */
router.post('/:space_id/invite', isAuthenticated, controller.postSpaceInvite);

/**
 * @swagger
 * /v1/workspaces/join:
 *   post:
 *     summary: 워크스페이스 참여 신청
 *     tags: [Workspaces]
 *     security:
 *       - CookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               space_password:
 *                 type: string
 *                 example: "mypassword123"
 *     responses:
 *       200:
 *         description: 워크스페이스 참여 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 로그인되지 않은 사용자
 *       409:
 *         description: 이미 해당 워크스페이스의 멤버인 경우
 *       500:
 *         description: 서버 오류 발생
 */
router.post('/join', isAuthenticated, controller.postSpaceJoin);

/**
 * @swagger
 * /v1/workspaces/{space_id}:
 *   get:
 *     summary: 특정 워크스페이스 조회
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 워크스페이스 ID
 *     responses:
 *       200:
 *         description: 특정 워크스페이스 정보 반환
 */
router.get('/:space_id', isAuthenticated, controller.getSpace);

/**
 * @swagger
 * /v1/workspaces/{space_id}/member:
 *   get:
 *     summary: 특정 워크스페이스 멤버 조회
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 워크스페이스 ID
 *     responses:
 *       200:
 *         description: 해당 워크스페이스 멤버 목록 반환
 */
router.get('/:space_id/member', isAuthenticated, controller.getSpaceMember);

/**
 * @swagger
 * /v1/workspaces/{space_id}/destroy:
 *   post:
 *     summary: 워크스페이스 삭제
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 삭제할 워크스페이스 ID
 *     responses:
 *       200:
 *         description: 워크스페이스가 성공적으로 삭제됨
 *       403:
 *         description: 호스트만 삭제할 수 있음
 *       404:
 *         description: 워크스페이스를 찾을 수 없음
 */
router.post('/:space_id/destroy', isAuthenticated, controller.postSpaceDestroy);

/**
 * @swagger
 * /v1/workspaces/{space_id}/leave:
 *   post:
 *     summary: 워크스페이스 떠나기
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 떠날 워크스페이스 ID
 *     responses:
 *       200:
 *         description: 워크스페이스에서 성공적으로 나감
 *       403:
 *         description: 호스트는 탈퇴할 수 없음
 *       404:
 *         description: 참여자가 아님
 */
router.post('/:space_id/leave', isAuthenticated, controller.postSpaceLeave);

module.exports = router;
