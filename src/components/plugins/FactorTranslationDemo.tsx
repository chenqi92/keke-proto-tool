import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { protocolRepositoryService, ParsedFactor, FactorSummary, HJ212ParseResult } from '@/services/ProtocolRepositoryService';
import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';

interface FactorTranslationDemoProps {
  protocolId?: string;
}

const FactorTranslationDemo: React.FC<FactorTranslationDemoProps> = ({ 
  protocolId = 'hj212-complete' 
}) => {
  const [factorString, setFactorString] = useState('a00001-7.45-N,a01001-8.32-N,a01003-15.6-N');
  const [hj212Message, setHj212Message] = useState('##0130QN=20231201120000001;ST=21;CN=2011;PW=123456;MN=12345678901234;Flag=0;CP=&&DataTime=20231201120000;PolId=a00001-7.45-N,a01001-8.32-N,a01003-15.6-N&&1234\r\n');
  const [parsedFactors, setParsedFactors] = useState<ParsedFactor[]>([]);
  const [factorSummary, setFactorSummary] = useState<FactorSummary | null>(null);
  const [hj212Result, setHj212Result] = useState<HJ212ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse factor codes
  const handleParseFactors = async () => {
    if (!factorString.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const factors = await protocolRepositoryService.parseFactorCodes(protocolId, factorString);
      const summary = await protocolRepositoryService.getFactorSummary(protocolId, factorString);
      
      setParsedFactors(factors);
      setFactorSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse factor codes');
    } finally {
      setLoading(false);
    }
  };

  // Parse HJ212 message
  const handleParseHJ212 = async () => {
    if (!hj212Message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await protocolRepositoryService.parseHJ212Message(protocolId, hj212Message);
      setHj212Result(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse HJ212 message');
    } finally {
      setLoading(false);
    }
  };

  // Auto-parse on component mount
  useEffect(() => {
    if (factorString.trim()) {
      handleParseFactors();
    }
  }, [protocolId]);

  // Get quality flag color
  const getQualityFlagColor = (flag?: string) => {
    switch (flag) {
      case 'N': return 'bg-green-100 text-green-800';
      case 'D': return 'bg-red-100 text-red-800';
      case 'M': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'water_quality': return 'bg-blue-100 text-blue-800';
      case 'water_pollution': return 'bg-red-100 text-red-800';
      case 'water_nutrition': return 'bg-green-100 text-green-800';
      case 'air_quality': return 'bg-purple-100 text-purple-800';
      case 'air_particle': return 'bg-orange-100 text-orange-800';
      case 'heavy_metals': return 'bg-gray-100 text-gray-800';
      case 'toxic_substances': return 'bg-red-100 text-red-800';
      case 'organic_pollutants': return 'bg-orange-100 text-orange-800';
      case 'noise': return 'bg-indigo-100 text-indigo-800';
      case 'flow': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  // Get alarm status color
  const getAlarmStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'bg-green-100 text-green-800';
      case 'HighAlarm': return 'bg-red-100 text-red-800';
      case 'LowAlarm': return 'bg-yellow-100 text-yellow-800';
      case 'OutOfRange': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get alarm status text
  const getAlarmStatusText = (status: string) => {
    switch (status) {
      case 'Normal': return '正常';
      case 'HighAlarm': return '高报警';
      case 'LowAlarm': return '低报警';
      case 'OutOfRange': return '超范围';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            HJ212 因子代码翻译演示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="factors" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="factors">因子解析</TabsTrigger>
              <TabsTrigger value="message">消息解析</TabsTrigger>
            </TabsList>

            <TabsContent value="factors" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="factor-string">因子字符串</Label>
                <div className="flex gap-2">
                  <Input
                    id="factor-string"
                    value={factorString}
                    onChange={(e) => setFactorString(e.target.value)}
                    placeholder="例如: a00001-7.45-N,a01001-8.32-N"
                    className="flex-1"
                  />
                  <Button onClick={handleParseFactors} disabled={loading}>
                    {loading ? '解析中...' : '解析'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  格式：因子代码-数值-质量标识，多个因子用逗号分隔
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {factorSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">解析统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{factorSummary.total_factors}</div>
                        <div className="text-sm text-muted-foreground">总因子数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{factorSummary.unknown_factors}</div>
                        <div className="text-sm text-muted-foreground">未知因子</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Object.keys(factorSummary.categories).length}
                        </div>
                        <div className="text-sm text-muted-foreground">分类数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{factorSummary.validation_errors}</div>
                        <div className="text-sm text-muted-foreground">验证错误</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {parsedFactors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">解析结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {parsedFactors.map((factor, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {factor.code}
                              </Badge>
                              <span className="font-medium">{factor.name}</span>
                              {factor.name_en && (
                                <span className="text-sm text-muted-foreground">({factor.name_en})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {factor.quality_flag && (
                                <Badge className={getQualityFlagColor(factor.quality_flag)}>
                                  {factor.quality_flag} - {factor.quality_description}
                                </Badge>
                              )}
                              {factor.is_unknown ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <Badge className={getCategoryColor(factor.category)}>
                              {factor.category}
                            </Badge>
                            {factor.value !== undefined && (
                              <span>
                                <strong>数值:</strong> {factor.value} {factor.unit}
                              </span>
                            )}
                            {factor.alarm_status && (
                              <Badge className={getAlarmStatusColor(factor.alarm_status)}>
                                {getAlarmStatusText(factor.alarm_status)}
                              </Badge>
                            )}
                          </div>

                          {(factor.standard_value !== undefined || factor.quality_grade) && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {factor.standard_value !== undefined && (
                                <span>
                                  <strong>标准值:</strong> {factor.standard_value} {factor.unit}
                                </span>
                              )}
                              {factor.quality_grade && (
                                <span>
                                  <strong>质量等级:</strong> {factor.quality_grade}
                                </span>
                              )}
                            </div>
                          )}

                          {factor.validation_errors.length > 0 && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {factor.validation_errors.join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hj212-message">HJ212 消息</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="hj212-message"
                    value={hj212Message}
                    onChange={(e) => setHj212Message(e.target.value)}
                    placeholder="输入完整的HJ212消息..."
                    className="flex-1 min-h-[100px]"
                  />
                </div>
                <Button onClick={handleParseHJ212} disabled={loading} className="w-full">
                  {loading ? '解析中...' : '解析HJ212消息'}
                </Button>
              </div>

              {hj212Result && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">消息解析结果</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div><strong>协议字段数:</strong> {Object.keys(hj212Result.parse_result.fields || {}).length}</div>
                        <div><strong>因子数量:</strong> {hj212Result.parsed_factors.length}</div>
                        {hj212Result.factor_summary && (
                          <div><strong>未知因子:</strong> {hj212Result.factor_summary.unknown_factors}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {hj212Result.parsed_factors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">提取的因子数据</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {hj212Result.parsed_factors.map((factor, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{factor.code}</Badge>
                                  <span className="font-medium">{factor.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {factor.value !== undefined && (
                                    <span className="text-lg font-bold">
                                      {factor.value} {factor.unit}
                                    </span>
                                  )}
                                  {factor.quality_flag && (
                                    <Badge className={getQualityFlagColor(factor.quality_flag)}>
                                      {factor.quality_description}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FactorTranslationDemo;
