import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { helpdeskKnowledgeBase } from '@/data/mockData';
import { ArrowRight, FileText, Eye, ThumbsUp } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const Resources: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const recentArticles = helpdeskKnowledgeBase.slice(0, 3);
  const totalArticles = helpdeskKnowledgeBase.length;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Knowledge Base</CardTitle>
        <Link to="/knowledge-base">
          <Button variant="ghost" size="sm" className="gap-2 h-8">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent ref={containerRef} className="space-y-4">
        {/* Stats */}
        <div 
          className={getItemClassName("grid grid-cols-2 gap-3")}
          style={getItemStyle(0)}
        >
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-primary">{totalArticles}</p>
            <p className="text-xs text-muted-foreground">Articles</p>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-green-600">
              {helpdeskKnowledgeBase.reduce((sum, article) => sum + article.views, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </div>
        </div>

        {/* Recent Articles */}
        <div 
          className={getItemClassName("space-y-3")}
          style={getItemStyle(1)}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent Articles</h4>
          </div>
          
          {recentArticles.length > 0 ? (
            <div className="space-y-2">
              {recentArticles.map((article, index) => (
                <div 
                  key={article.id} 
                  className={getItemClassName("p-2 rounded-lg bg-muted/30 space-y-2")}
                  style={getItemStyle(2 + index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {article.content.substring(0, 60)}...
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize ml-2">
                      {article.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {article.helpful}
                      </span>
                    </div>
                    <span>{formatDate(article.lastUpdated)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className={getItemClassName("text-center py-4")}
              style={getItemStyle(2)}
            >
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No articles found</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div 
          className={getItemClassName("pt-3 border-t")}
          style={getItemStyle(5)}
        >
          <Link to="/knowledge-base" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8">
              <FileText className="h-3 w-3" />
              <span className="text-xs">Browse Knowledge Base</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
