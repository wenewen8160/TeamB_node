// routes/member-activities.js
import express from "express";
import db from "../utils/connect-mysql.js";

const router = express.Router();
// 查詢會員已報名活動
router.get("/:memberId/activities", async (req, res) => {
  const memberId = +req.params.memberId || 0;
  const output = {
    success: false,
    activities: [],
  };

  try {
    const [rows] = await db.query(
      `SELECT 
    al.al_id,
    al.activity_name,
    al.activity_time,
    al.introduction,
    al.avatar,
    al.deadline,
    al.payment,
    al.need_num,
    m.name AS name,
    (
        SELECT IFNULL(SUM(num), 0)
        FROM registered
        WHERE activity_id = al.al_id
    ) AS registered_people,
    st.sport_name,
    ci.name AS court_name,
    TRUE AS is_registered
  FROM registered r
  JOIN activity_list al ON r.activity_id = al.al_id
  JOIN sport_type st ON al.sport_type_id = st.id
  JOIN court_info ci ON al.court_id = ci.id
  JOIN members m ON al.founder_id = m.id
  WHERE r.member_id = ?
  GROUP BY al.al_id, al.activity_name, st.sport_name, ci.name;`,
    [memberId, memberId]
    );
    // 格式化時間為 YYYY-MM-DD HH:mm
    rows.forEach((activity) => {
      activity.activity_time = formatDateTime(activity.activity_time);
      activity.deadline = formatDateTime(activity.deadline);
    });
    output.activities = rows;
    output.success = true;
  } catch (err) {
    output.error = err.message;
  }

  res.json(output);
});
// 查詢會員創建的活動
router.get("/:memberId/created-activities", async (req, res) => {
  const memberId = +req.params.memberId || 0;
  const output = {
    success: false,
    activities: [],
    error: "",
  };

  // 檢查是否有傳入有效的 memberId
  if (!memberId) {
    output.error = "無效的會員 ID";
    return res.json(output);
  }

  try {
    const r_sql = `
      SELECT 
        al.al_id,
        al.activity_name,
        al.activity_time,
        al.introduction,
        al.avatar,
        al.deadline,
        al.payment,
        al.need_num,
        al.area_id,
        al.court_id,
        al.sport_type_id,
        al.avatar,
        al.avatar2,
        al.avatar3,
        al.avatar4,
        IFNULL(SUM(r.num), 0) AS registered_people,
        st.sport_name,
        ci.name AS court_name,
        IF(f.id IS NOT NULL, true, false) AS is_favorite
      FROM activity_list al
      JOIN sport_type st ON al.sport_type_id = st.id
      JOIN court_info ci ON al.court_id = ci.id
      LEFT JOIN registered r ON al.al_id = r.activity_id
      LEFT JOIN favorites f ON f.activity_id = al.al_id AND f.member_id = ?
      WHERE al.founder_id = ?
      GROUP BY al.al_id, al.activity_name, st.sport_name, ci.name
    `;

    const [rows] = await db.query(r_sql, [memberId, memberId]);

    // 如果有資料則返回活動列表
    if (rows.length > 0) {
      // 格式化時間為 YYYY-MM-DD HH:mm
      rows.forEach((activity) => {
        activity.activity_time = formatDateTime(activity.activity_time);
        activity.deadline = formatDateTime(activity.deadline);
      });
      output.activities = rows;
      output.success = true;
    } else {
      output.error = "該會員沒有創建任何活動";
    }
  } catch (err) {
    // 捕獲並返回錯誤
    output.error = err.message;
  }

  res.json(output);
});
// 查詢會員已收藏的活動
router.get("/:memberId/favorites", async (req, res) => {
  const memberId = +req.params.memberId || 0;
  const output = {
    success: false,
    activities: [],
    error: "",
  };

  // 檢查會員ID是否有效
  if (!memberId) {
    output.error = "無效的會員 ID";
    return res.json(output);
  }

  try {
    const r_sql = `
      SELECT 
        al.al_id,
        al.activity_name,
        al.activity_time,
        al.introduction,
        al.avatar,
        al.deadline,
        al.payment,
        al.need_num,
        m.name AS name,
        IFNULL(SUM(r.num), 0) AS registered_people,
        st.sport_name,
        ci.name AS court_name,
        IF(f.id IS NULL, 0, 1) AS is_favorite
      FROM favorites f
      JOIN activity_list al ON f.activity_id = al.al_id
      JOIN sport_type st ON al.sport_type_id = st.id
      JOIN court_info ci ON al.court_id = ci.id
      JOIN members m ON al.founder_id = m.id
      LEFT JOIN registered r ON al.al_id = r.activity_id
      WHERE f.member_id = ?
      GROUP BY al.al_id, al.activity_name, st.sport_name, ci.name
    `;

    const [rows] = await db.query(r_sql, [memberId]);

    // 如果有資料，返回收藏的活動
    if (rows.length > 0) {
      // 格式化時間為 YYYY-MM-DD HH:mm
      rows.forEach((activity) => {
        activity.activity_time = formatDateTime(activity.activity_time);
        activity.deadline = formatDateTime(activity.deadline);
      });
      output.activities = rows;
      output.success = true;
    } else {
      output.error = "沒有收藏的活動";
    }
  } catch (err) {
    output.error = err.message;
  }

  res.json(output);
});

// 格式化日期為 YYYY-MM-DD HH:mm 格式
function formatDateTime(dateTime) {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export default router;
