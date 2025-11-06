import { DataEntry } from '../types';

/**
 * 测试数据生成器
 * 用于生成大量测试数据以测试应用性能
 */
export class TestDataGenerator {
  private static readonly SAMPLE_LOCATIONS = [
    '北京市朝阳区',
    '上海市浦东新区',
    '广州市天河区',
    '深圳市南山区',
    '杭州市西湖区',
    '成都市锦江区',
    '武汉市武昌区',
    '西安市雁塔区',
    '南京市鼓楼区',
    '重庆市渝中区'
  ];

  private static readonly SAMPLE_QUESTIONS = [
    '这个地方的交通便利程度如何？',
    '该区域的商业发展情况怎样？',
    '这里的教育资源分布如何？',
    '该地区的环境质量状况如何？',
    '这个位置的人口密度大吗？',
    '该区域的房价水平如何？',
    '这里的医疗设施完善吗？',
    '该地方的文化氛围怎样？',
    '这个区域的就业机会多吗？',
    '该地区的基础设施建设如何？'
  ];

  private static readonly SAMPLE_ANSWERS = [
    '根据地图显示，该区域交通网络发达，有多条地铁线路和公交线路覆盖。',
    '从卫星图像可以看出，该区域商业建筑密集，商业活动频繁。',
    '地图上标注了多所学校和教育机构，教育资源相对丰富。',
    '根据环境监测数据，该区域绿化覆盖率较高，空气质量良好。',
    '从人口热力图可以看出，该区域人口密度适中，不算过于拥挤。',
    '根据房价数据显示，该区域房价处于中等偏上水平。',
    '地图显示该区域有多家医院和诊所，医疗设施较为完善。',
    '该区域有多个文化场所和历史景点，文化氛围浓厚。',
    '从产业分布图可以看出，该区域有多个商业中心和办公区，就业机会较多。',
    '基础设施建设完善，水电气网络覆盖全面。'
  ];

  private static readonly SAMPLE_TAGS = [
    '交通', '商业', '教育', '环境', '人口', '房价', '医疗', '文化', '就业', '基础设施'
  ];

  /**
   * 生成随机的Base64图片数据（简单的彩色方块）
   */
  private static generateRandomImage(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    
    // 生成随机背景色
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, 400, 300);
    
    // 添加一些随机形状
    for (let i = 0; i < 5; i++) {
      const shapeR = Math.floor(Math.random() * 256);
      const shapeG = Math.floor(Math.random() * 256);
      const shapeB = Math.floor(Math.random() * 256);
      ctx.fillStyle = `rgb(${shapeR}, ${shapeG}, ${shapeB})`;
      
      const x = Math.random() * 300;
      const y = Math.random() * 200;
      const size = 20 + Math.random() * 80;
      
      ctx.fillRect(x, y, size, size);
    }
    
    return canvas.toDataURL('image/png');
  }

  /**
   * 生成单个测试数据条目
   */
  private static generateSingleEntry(index: number): DataEntry {
    const location = this.SAMPLE_LOCATIONS[index % this.SAMPLE_LOCATIONS.length];
    const question = this.SAMPLE_QUESTIONS[index % this.SAMPLE_QUESTIONS.length];
    const answer = this.SAMPLE_ANSWERS[index % this.SAMPLE_ANSWERS.length];
    const tag = this.SAMPLE_TAGS[index % this.SAMPLE_TAGS.length];
    
    const now = new Date();
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // 过去30天内随机时间
    
    return {
      id: `test-entry-${index}-${Date.now()}`,
      query: `${question} (测试数据 #${index + 1}) - ${location}`,
      solution: `基于地理信息分析，${answer} 这是第${index + 1}条测试数据。`,
      gt_answer: `${answer} 这是第${index + 1}条测试数据的标准答案。`,
      tags: { category: tag, type: '测试数据', location: location },
      image: this.generateRandomImage(),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      version: 1
    };
  }

  /**
   * 批量生成测试数据
   */
  static generateTestData(count: number): DataEntry[] {
    const entries: DataEntry[] = [];
    
    for (let i = 0; i < count; i++) {
      entries.push(this.generateSingleEntry(i));
    }
    
    return entries;
  }

  /**
   * 生成测试数据并返回生成进度
   */
  static async generateTestDataWithProgress(
    count: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<DataEntry[]> {
    const entries: DataEntry[] = [];
    const batchSize = 10; // 每批生成10条数据
    
    for (let i = 0; i < count; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, count);
      
      for (let j = i; j < batchEnd; j++) {
        entries.push(this.generateSingleEntry(j));
      }
      
      // 报告进度
      if (onProgress) {
        onProgress(batchEnd, count);
      }
      
      // 让出控制权，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return entries;
  }
}