import { OpenSourceRobotMeta, PracticalActionMeta } from '../types/robot';

export const OPEN_SOURCE_ROBOTS: OpenSourceRobotMeta[] = [
  {
    id: 'unitree_g1',
    name: 'Unitree G1 Humanoid',
    alias: '宇树 G1 量产型人形机器人',
    creator: 'Unitree Robotics (宇树科技)',
    country: '中国',
    dof: 23,
    openSourceType: 'URDF / Meshes / ROS2 SDK / MuJoCo',
    githubUrl: 'https://github.com/unitreerobotics/unitree_ros',
    description: '当前全球最受关注的开源量产级人形机器人之一。全身搭载高扭矩密度环形关节电机，具备极佳的机动性、动态平衡与灵巧双臂示教能力。大臂前臂尺寸精准紧凑，适合工业巡检与通用双臂作业。',
    recommendedParams: {
      upperArmLength: 0.28,
      forearmLength: 0.25,
      handLength: 0.15,
      shoulderWidth: 0.38,
      torsoHeight: 0.52,
      gearRatio: 45,
      maxAngularSpeed: 200,
      dampingFactor: 1.0, // Critical damping ratio zeta=1.0 (zero overshoot)
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 400,
      springStiffness: 10.0,
    },
    colorScheme: {
      darkArmor: 0x14171f, // 深炭灰磨砂阳极氧化铝
      silverJoint: 0x94a3b8, // 钛银关节圆环
      accent: 0x38bdf8, // 天蓝碳纤维防撞外壳
      glow: 0x00f0ff, // 环形 LED 编码器灯环
    },
  },
  {
    id: 'stanford_aloha',
    name: 'Stanford Mobile ALOHA',
    alias: '斯坦福大学双臂低成本遥操作机器人',
    creator: 'Stanford University (Tony Zhao / Chelsea Finn)',
    country: '美国',
    dof: 14,
    openSourceType: 'Full Hardware CAD / URDF / 3D Print / ROS2',
    githubUrl: 'https://github.com/tonyzhaozh/aloha',
    description: '斯坦福大学开源的双臂遥操作（Teleoperation）顶流开源平台。采用 ViperX 双臂协同架构，专为人类穿戴/摄像头动作捕捉示教而生，广泛用于炒菜、插拔线缆、擦桌子等通用具身智能数据采集。',
    recommendedParams: {
      upperArmLength: 0.30,
      forearmLength: 0.30,
      handLength: 0.18,
      shoulderWidth: 0.44,
      torsoHeight: 0.58,
      gearRatio: 60,
      maxAngularSpeed: 150,
      dampingFactor: 1.0,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 320,
      springStiffness: 8.5,
    },
    colorScheme: {
      darkArmor: 0x1e293b, // 工业铝合金型材深青灰
      silverJoint: 0x0284c7, // ALOHA 标志性深蓝双指平行夹爪
      accent: 0xe2e8f0, // 银白伺服连杆
      glow: 0x38bdf8, // 末端 RGB-D 摄像头补光
    },
  },
  {
    id: 'fourier_gr1',
    name: 'Fourier GR-1 Humanoid',
    alias: '傅利叶智能通用人形机器人',
    creator: 'Fourier Intelligence (傅利叶智能)',
    country: '中国',
    dof: 32,
    openSourceType: 'URDF / Kinematics Model / Unity Digital Twin',
    githubUrl: 'https://github.com/FourierRobotics',
    description: '面向通用工业与康复协助的全尺寸双足人形机器人。拥有 54 个自由度执行机构，自研 FSA 执行器具备高达 230Nm 瞬时峰值扭矩。连杆刚性极强，适合重载搬运与工业装配。',
    recommendedParams: {
      upperArmLength: 0.33,
      forearmLength: 0.30,
      handLength: 0.17,
      shoulderWidth: 0.46,
      torsoHeight: 0.62,
      gearRatio: 75,
      maxAngularSpeed: 140,
      dampingFactor: 1.05,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 280,
      springStiffness: 8.0,
    },
    colorScheme: {
      darkArmor: 0xf1f5f9, // 傅利叶医疗级哑光极简纯白外壳
      silverJoint: 0x334155, // 黑色 FSA 执行器内胆
      accent: 0xf97316, // 亮橙色警示安全防撞胶条
      glow: 0xf97316, // 橙色动力核心光环
    },
  },
  {
    id: 'inmoov',
    name: 'InMoov 3D Maker Humanoid',
    alias: 'InMoov 开源 3D 打印人形机器人',
    creator: 'Gaël Langevin (法国创客先驱)',
    country: '法国',
    dof: 24,
    openSourceType: 'STL 3D Print / Arduino Firmware / Blender / URDF',
    githubUrl: 'http://inmoov.fr/',
    description: '开源创客界历史最悠久、部署最广泛的 1:1 全尺寸开源 3D 打印人形机器人。基于桌面级 3D 打印机与标准高扭矩舵机构建，拥有灵巧的人形 5 指肌腱拉索手，是低成本机械仿生遥控的鼻祖。',
    recommendedParams: {
      upperArmLength: 0.31,
      forearmLength: 0.28,
      handLength: 0.16,
      shoulderWidth: 0.42,
      torsoHeight: 0.56,
      gearRatio: 40,
      maxAngularSpeed: 120,
      dampingFactor: 1.1,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 250,
      springStiffness: 7.5,
    },
    colorScheme: {
      darkArmor: 0xdde3ea, // 3D 打印象牙白 PLA 材质
      silverJoint: 0x475569, // 舵机支架深灰基座
      accent: 0x64748b, // 关节螺栓与连杆筋条
      glow: 0x22c55e, // 创客 Arduino 运行绿灯
    },
  },
  {
    id: 'cyberkinetic',
    name: 'CyberKinetic Titan v2',
    alias: '高机动战术与低延迟仿真试验平台',
    creator: 'CyberKinetic Lab',
    country: '国际开放规范',
    dof: 28,
    openSourceType: 'Digital Twin URDF / ROS2 Teleop Protocol',
    githubUrl: 'https://github.com/CyberKinetic/humanoid-twin',
    description: '本平台原生参考架构。集成碳化钨装甲防护、多自由度脊柱倾转与零背隙谐波减速机，专为超低延迟 MQTT 远程数字孪生与高动态运动规划而优化。',
    recommendedParams: {
      upperArmLength: 0.30,
      forearmLength: 0.28,
      handLength: 0.16,
      shoulderWidth: 0.42,
      torsoHeight: 0.55,
      gearRatio: 50,
      maxAngularSpeed: 180,
      dampingFactor: 1.0,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 360,
      springStiffness: 9.0,
    },
    colorScheme: {
      darkArmor: 0x181e28, // 钛黑战术涂层
      silverJoint: 0xcfd8dc, // 航空铝银抛光
      accent: 0xf59e0b, // 琥珀黄碳纤维嵌板
      glow: 0x00f0ff, // 赛博青核聚变光源
    },
  },
  {
    id: 'industrial_6axis',
    name: 'Universal 6-Axis Arm',
    alias: '通用标准 6 轴工业关节机械臂 (UR5e / KUKA 构型)',
    creator: 'Universal Robots / ROS-Industrial',
    country: '丹麦 / 国际开源体系',
    dof: 6,
    openSourceType: 'ROS2 ur_robot_driver / MoveIt2 / URDF CAD',
    githubUrl: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Driver',
    description: '工业制造与智慧产线应用最广的 6 自由度串联关节机械手标准构型（Base Yaw, Shoulder Pitch, Elbow Pitch, Wrist 1 Pitch, Wrist 2 Yaw, Wrist 3 Roll）。配备重型工业法兰与气动双指夹爪，支持高精度 3D 码垛、精密弧焊、机床上下料与去毛刺打磨。',
    robotCategory: 'industrial_arm',
    recommendedParams: {
      upperArmLength: 0.42,
      forearmLength: 0.38,
      handLength: 0.18,
      shoulderWidth: 0.32,
      torsoHeight: 0.45,
      gearRatio: 101,
      maxAngularSpeed: 180,
      dampingFactor: 1.0,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 360,
      springStiffness: 9.0,
    },
    colorScheme: {
      darkArmor: 0x242d3d, // 工业深青灰铸铝外壳
      silverJoint: 0x0284c7, // 标志性 UR / KUKA 工业海蓝密封关节圈
      accent: 0xf59e0b, // 亮黄警示安全反光条
      glow: 0x38bdf8, // 示教器就绪状态指示灯
    },
  },
  {
    id: 'scara_4axis',
    name: 'SCARA Industrial 4-Axis',
    alias: '4 轴 SCARA 工业平面关节装配机器人',
    creator: 'Epson / Yamaha / Dobot Open Architecture',
    country: '日本 / 全球 3C 制造标准',
    dof: 4,
    openSourceType: 'ROS2 SCARA Kinematics / LinuxCNC / URDF',
    githubUrl: 'https://github.com/ros-industrial/universal_robot',
    description: '现代 3C 电子制造与晶圆半导体封测的核心生产力——SCARA（Selective Compliance Assembly Robot Arm）水平多关节机械手。具备水平 X-Y 平面内的高刚性柔顺装配，包含 Arm1 转角(J1)、Arm2 转角(J2)、Z 轴高速滚珠花键丝杠升降(J3)与末端 R 轴旋转(J4)。专为微秒级高速贴片、传送带视觉分拣与自动化螺钉紧固而生。',
    robotCategory: 'scara',
    recommendedParams: {
      upperArmLength: 0.35,
      forearmLength: 0.25,
      handLength: 0.15,
      shoulderWidth: 0.28,
      torsoHeight: 0.50,
      gearRatio: 50,
      maxAngularSpeed: 300,
      dampingFactor: 0.95,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 600,
      springStiffness: 12.0,
    },
    colorScheme: {
      darkArmor: 0xf8fafc, // 洁净室纯白聚酯静电喷涂
      silverJoint: 0x06b6d4, // 高精度青色伺服盖板
      accent: 0x334155, // 重型铸铁加重基座
      glow: 0x10b981, // 洁净室运行就绪绿光
    },
  },
];

export const PRACTICAL_ACTIONS: PracticalActionMeta[] = [
  {
    id: 'palletizing_6axis',
    name: '6轴工业物料码垛与出入库 (Palletizing)',
    category: 'industrial',
    description: '标准 6 轴工业机械臂空间多层码垛轨迹：底座 J1 旋转转向进料传送带，肩部 J2 与肘部 J3 联动下探，末端气动夹爪闭合抓取箱体，平滑提升后回转至料盘托板，下放码垛并沿 Z 轴抽退，循环构筑整齐料堆。',
    keyJoints: ['J1 Base Yaw', 'J2 Shoulder Pitch', 'J3 Elbow Pitch', 'J5 Wrist Pitch', 'J6 Flange Clamp'],
    useCase: '重载箱体物流码垛、自动化仓储立库堆垛、纸箱分垛。',
  },
  {
    id: 'welding_seam_6axis',
    name: '6轴空间精密连续轨迹弧焊 (Arc Welding)',
    category: 'industrial',
    description: '6 轴机械臂末端焊枪沿空间 3D 复杂折线/圆弧工件焊缝保持恒定姿态角（Weld Angle 45°）平顺移动，腕部三轴联动保证焊枪姿态与行走速度均匀一致，消除熔深不均。',
    keyJoints: ['J1-J6 6-Axis Continuous Coordinate Coordinated Interpolation'],
    useCase: '汽车底盘车身焊接、钢结构高压管道封口、曲面激光熔覆。',
  },
  {
    id: 'scara_pcb_assembly',
    name: '4轴 SCARA 芯片高速贴片装配 (PCB Assembly)',
    category: 'industrial',
    description: '4 轴 SCARA 机械手在 0.35 秒内完成高节拍周期：J1/J2 关节水平平面超高速回转至料仓托盘上方，J3 轴高速丝杠垂直下冲 80mm 进行真空吸嘴取件，回弹上抬后摆向 PCB 焊盘位置，Z 轴精准下压贴片，J4 轴微旋转对齐引脚极性。',
    keyJoints: ['SCARA J1/J2 Horizontal Sweep', 'J3 Z-axis High-speed Quill Plunge', 'J4 Theta Orientation'],
    useCase: 'SMT 表面贴装、集成电路 IC 抓放、手机主板精密螺丝打紧。',
  },
  {
    id: 'scara_sorting',
    name: '4轴 SCARA 传送带高速视觉分拣 (Vision Sorting)',
    category: 'industrial',
    description: 'SCARA 平面多关节机械手配合流水线传送带视觉，高频左右摆臂将传送带流经的合格品与瑕疵品分别吸取并分发至左右两级料斗，呈现典型高加速度平顺柔顺动作。',
    keyJoints: ['SCARA J1 Base Swing', 'J2 Elbow Flex', 'J3 Z Pick-up Stroke'],
    useCase: '锂电池电芯高速分拣、医药安瓿瓶包装、食品流水线装盒。',
  },
  {
    id: 'pick_place',
    name: '工业双臂物料抓取与搬运',
    category: 'industrial',
    description: '两臂平稳张开下探抓取目标料箱，双臂合拢抱持，重心微向后倾，上抬至胸前并结合躯干旋转 30° 实现平稳放置。',
    keyJoints: ['L/R Shoulder Pitch', 'Elbow Flex', 'Spine Yaw', 'Gripper Clamping'],
    useCase: '自动化产线搬运、物料出入库、物流装卸货。',
  },
  {
    id: 'peg_in_hole',
    name: '桌面精细插拔与装配 (Mobile ALOHA 示教)',
    category: 'teleop',
    description: '双臂前伸 60°，肘部屈曲约 90° 形成稳定的桌面作业三角刚度，手腕做微小精准的 Pitch/Yaw 进退对准，模拟连接器插拔与精密螺钉旋拧。',
    keyJoints: ['L/R Wrist Pitch/Yaw', 'Elbow 90° lock', 'Shoulder Micro-trim'],
    useCase: '3C 电子装配、线缆插拔、实验室试管移液与细微手部遥操作。',
  },
  {
    id: 'handover',
    name: '双手平稳托盘递物与迎宾交互',
    category: 'service',
    description: '躯干轻微前屈 15° 呈礼貌姿势，双臂水平同步向前平推递出托盘，手腕水平自适应调平，稍停 1.5 秒后平稳缩回。',
    keyJoints: ['Spine Tilt', 'Shoulder Pitch 45°', 'Wrist Horizon Leveling'],
    useCase: '商用服务接待、餐饮配送、无接触医疗物资递送。',
  },
  {
    id: 'wipe_table',
    name: '表面平滑擦拭作业 (圆弧轨迹)',
    category: 'service',
    description: '右手伸展至桌面高度，末端执行器沿水平平面以圆弧 Lissajous 曲线平滑擦拭，左臂同步支撑平衡，手腕角度持续贴合平面。',
    keyJoints: ['R Shoulder Roll/Yaw', 'R Elbow Flex Cyclic', 'Spine Counter-balance'],
    useCase: '桌面清洁保洁、工业曲面打磨抛光、喷涂喷漆轨迹。',
  },
  {
    id: 'estop_shield',
    name: '应急避障与急停胸前交叉防护',
    category: 'safety',
    description: '检测到急停碰撞报警时，双臂在 0.2 秒内迅速收拢于胸前交叉成 X 形护盾，手腕内收拳握，头部低缩入颈托，保护传感器与伺服驱动器。',
    keyJoints: ['L/R Shoulder Cross Roll', 'Elbow Full Flex', 'Neck Pitch Down'],
    useCase: '人机共融协作安全急停、碰撞缓冲、跌倒前自我保护姿态。',
  },
  {
    id: 'taichi',
    name: '太极推手与柔顺动力学平衡',
    category: 'benchmark',
    description: '双臂以连续平滑的正弦相位差划大圆，躯干伴随大幅度柔顺回旋（Roll/Yaw），用于检验伺服驱动器抗冲击平顺性与逆运动学平滑度。',
    keyJoints: ['All 14 Joints Harmonious Harmonic Oscillation'],
    useCase: '伺服电机力矩平滑度基准测试、减速器背隙检测、全身动力学鲁棒性评估。',
  },
  {
    id: 'wave',
    name: '单臂挥手致意 (Waving Hello)',
    category: 'service',
    description: '右臂抬高至肩部上方，肘部屈曲 60°，手腕做高频周期性左右摆动，左臂自然下垂。',
    keyJoints: ['R Shoulder Pitch 80°', 'R Wrist Oscillation'],
    useCase: '展厅交互、人形机器人打招呼、视觉追踪锁定测试。',
  },
  {
    id: 'box',
    name: '双臂交替击打与格斗冲拳',
    category: 'benchmark',
    description: '双臂交替前冲打拳，测试电机的瞬态峰值加速度、最大角速度与制动阻尼响应。',
    keyJoints: ['L/R Elbow Fast Extension', 'Shoulder Punch Forward'],
    useCase: '极限角加速度测试、传动机构冲击疲劳寿命测试。',
  },
  {
    id: 'stretch',
    name: '双臂全身环转与关节极限拉伸',
    category: 'benchmark',
    description: '双臂同时进行 360° 全范围环转，验证肩关节三轴极限角限位与电缆抗缠绕裕度。',
    keyJoints: ['Shoulder Pitch/Roll Envelope Boundary Check'],
    useCase: '出厂极限关节角度标定、线束耐弯折寿命测试。',
  },
  {
    id: 'tpose',
    name: '标准 T-Pose 零位标定',
    category: 'benchmark',
    description: '双臂完全水平展开与地面平行（180°），躯干笔直，作为视觉动作捕捉与物理电机零点对齐的绝对基准姿势。',
    keyJoints: ['All Joints at Zero Neutral Position'],
    useCase: '光学动作捕捉初值校准、陀螺仪 IMU 零漂校准。',
  },
];
